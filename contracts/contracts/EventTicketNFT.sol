// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC2981} from "@openzeppelin/contracts/token/common/ERC2981.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract EventTicketNFT is ERC721URIStorage, ERC2981, Ownable, ReentrancyGuard {
    struct TierConfig {
        uint256 price;
        uint256 maxSupply;
    }

    struct Tier {
        uint256 price;
        uint256 maxSupply;
        uint256 minted;
        bool exists;
    }

    error InvalidTierConfig();
    error InvalidTier();
    error MintSoldOut();
    error TierSoldOut();
    error IncorrectPayment();
    error MaxPerWalletExceeded();
    error TicketAlreadyUsed();
    error TransfersDisabled();

    uint256 public immutable maxSupply;
    uint96 public immutable royaltyBps;
    uint256 public immutable maxPerWallet;
    uint8 public immutable tierCount;

    uint256 public nextTokenId;
    bool public transferable;
    bool public eventEnded;

    mapping(uint8 => Tier) public tiers;
    mapping(uint256 => uint8) public tokenIdToTierId;
    mapping(uint256 => bool) public tokenIdToUsed;
    mapping(address => uint256) public walletMinted;

    event TicketTierConfigured(uint8 indexed tierId, uint256 price, uint256 maxSupply);
    event TicketMinted(address indexed to, uint256 indexed tokenId, uint8 indexed tierId);
    event TicketUsed(uint256 indexed tokenId, address indexed usedBy);
    event TransferabilityUpdated(bool transferable);
    event EventEndedUpdated(bool eventEnded);
    event FundsWithdrawn(address indexed recipient, uint256 amount);

    constructor(
        string memory name_,
        string memory symbol_,
        address organizer_,
        TierConfig[] memory tierConfigs_,
        uint96 royaltyBps_,
        uint256 maxPerWallet_
    ) ERC721(name_, symbol_) Ownable(organizer_) {
        require(organizer_ != address(0), "Invalid organizer");
        require(maxPerWallet_ > 0, "Invalid wallet limit");
        require(royaltyBps_ <= 10000, "Invalid royalty");
        require(tierConfigs_.length > 0 && tierConfigs_.length <= type(uint8).max, "Invalid tier count");

        uint256 totalSupply;
        for (uint256 i = 0; i < tierConfigs_.length; i++) {
            TierConfig memory tierConfig = tierConfigs_[i];
            if (tierConfig.price == 0 || tierConfig.maxSupply == 0) revert InvalidTierConfig();

            uint8 tierId = uint8(i);
            tiers[tierId] = Tier({
                price: tierConfig.price,
                maxSupply: tierConfig.maxSupply,
                minted: 0,
                exists: true
            });
            totalSupply += tierConfig.maxSupply;

            emit TicketTierConfigured(tierId, tierConfig.price, tierConfig.maxSupply);
        }

        maxSupply = totalSupply;
        royaltyBps = royaltyBps_;
        maxPerWallet = maxPerWallet_;
        tierCount = uint8(tierConfigs_.length);
        transferable = true;
    }

    function mint(uint8 tierId, string calldata tokenURI_) external payable nonReentrant returns (uint256 tokenId) {
        if (nextTokenId >= maxSupply) revert MintSoldOut();
        if (walletMinted[msg.sender] >= maxPerWallet) revert MaxPerWalletExceeded();

        Tier storage tier = tiers[tierId];
        if (!tier.exists) revert InvalidTier();
        if (tier.minted >= tier.maxSupply) revert TierSoldOut();
        if (msg.value != tier.price) revert IncorrectPayment();

        tokenId = _mintTicket(msg.sender, tierId, tokenURI_);
        emit TicketMinted(msg.sender, tokenId, tierId);
    }

    function organizerMint(address to, uint8 tierId, string calldata tokenURI_) external onlyOwner returns (uint256 tokenId) {
        if (nextTokenId >= maxSupply) revert MintSoldOut();
        if (walletMinted[to] >= maxPerWallet) revert MaxPerWalletExceeded();

        Tier storage tier = tiers[tierId];
        if (!tier.exists) revert InvalidTier();
        if (tier.minted >= tier.maxSupply) revert TierSoldOut();

        tokenId = _mintTicket(to, tierId, tokenURI_);
        emit TicketMinted(to, tokenId, tierId);
    }

    function batchOrganizerMint(
        address[] calldata recipients,
        uint8 tierId,
        string[] calldata tokenURIs
    ) external onlyOwner {
        require(recipients.length == tokenURIs.length, "Length mismatch");

        Tier storage tier = tiers[tierId];
        if (!tier.exists) revert InvalidTier();

        for (uint256 i = 0; i < recipients.length; i++) {
            if (nextTokenId >= maxSupply) revert MintSoldOut();
            if (walletMinted[recipients[i]] >= maxPerWallet) revert MaxPerWalletExceeded();
            if (tier.minted >= tier.maxSupply) revert TierSoldOut();

            uint256 tokenId = _mintTicket(recipients[i], tierId, tokenURIs[i]);
            emit TicketMinted(recipients[i], tokenId, tierId);
        }
    }

    function useTicket(uint256 tokenId) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Token not found");
        if (tokenIdToUsed[tokenId]) revert TicketAlreadyUsed();

        tokenIdToUsed[tokenId] = true;
        emit TicketUsed(tokenId, msg.sender);
    }

    function setTransferable(bool enabled) external onlyOwner {
        transferable = enabled;
        emit TransferabilityUpdated(enabled);
    }

    function setEventEnded(bool ended) external onlyOwner {
        eventEnded = ended;
        emit EventEndedUpdated(ended);
    }

    function withdraw() external onlyOwner nonReentrant {
        uint256 amount = address(this).balance;
        require(amount > 0, "No funds");

        (bool ok, ) = owner().call{value: amount}("");
        require(ok, "Withdraw failed");

        emit FundsWithdrawn(owner(), amount);
    }

    function getTier(uint8 tierId) external view returns (Tier memory) {
        Tier memory tier = tiers[tierId];
        if (!tier.exists) revert InvalidTier();
        return tier;
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        address from = _ownerOf(tokenId);
        bool isTransfer = from != address(0) && to != address(0);

        if (isTransfer && (!transferable || eventEnded || tokenIdToUsed[tokenId])) {
            revert TransfersDisabled();
        }

        return super._update(to, tokenId, auth);
    }

    function _mintTicket(address to, uint8 tierId, string calldata tokenURI_) internal returns (uint256 tokenId) {
        Tier storage tier = tiers[tierId];

        walletMinted[to] += 1;
        tier.minted += 1;
        tokenId = ++nextTokenId;

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI_);
        tokenIdToTierId[tokenId] = tierId;
        _setTokenRoyalty(tokenId, owner(), royaltyBps);
    }
}
