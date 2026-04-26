// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC2981} from "@openzeppelin/contracts/token/common/ERC2981.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract EventTicketNFT is ERC721URIStorage, ERC2981, Ownable, ReentrancyGuard {
    enum TicketType {
        GENERAL,
        VIP,
        VVIP
    }

    error MintSoldOut();
    error IncorrectPayment();
    error MaxPerWalletExceeded();
    error TicketAlreadyUsed();
    error TransfersDisabled();

    uint256 public immutable maxSupply;
    uint256 public immutable ticketPrice;
    uint96 public immutable royaltyBps;
    uint256 public immutable maxPerWallet;

    uint256 public nextTokenId;
    bool public transferable;
    bool public eventEnded;

    mapping(uint256 => TicketType) public tokenIdToTicketType;
    mapping(uint256 => bool) public tokenIdToUsed;
    mapping(address => uint256) public walletMinted;

    event TicketMinted(address indexed to, uint256 indexed tokenId, TicketType ticketType);
    event TicketUsed(uint256 indexed tokenId, address indexed usedBy);
    event TransferabilityUpdated(bool transferable);
    event EventEndedUpdated(bool eventEnded);
    event FundsWithdrawn(address indexed recipient, uint256 amount);

    constructor(
        string memory name_,
        string memory symbol_,
        address organizer_,
        uint256 maxSupply_,
        uint256 ticketPrice_,
        uint96 royaltyBps_,
        uint256 maxPerWallet_
    ) ERC721(name_, symbol_) Ownable(organizer_) {
        require(organizer_ != address(0), "Invalid organizer");
        require(maxSupply_ > 0, "Invalid supply");
        require(maxPerWallet_ > 0, "Invalid wallet limit");
        require(royaltyBps_ <= 10000, "Invalid royalty");

        maxSupply = maxSupply_;
        ticketPrice = ticketPrice_;
        royaltyBps = royaltyBps_;
        maxPerWallet = maxPerWallet_;
        transferable = true;
    }

    function mint(TicketType ticketType, string calldata tokenURI_) external payable nonReentrant returns (uint256 tokenId) {
        if (nextTokenId >= maxSupply) revert MintSoldOut();
        if (msg.value != ticketPrice) revert IncorrectPayment();
        if (walletMinted[msg.sender] >= maxPerWallet) revert MaxPerWalletExceeded();

        tokenId = _mintTicket(msg.sender, ticketType, tokenURI_);
        emit TicketMinted(msg.sender, tokenId, ticketType);
    }

    function organizerMint(address to, TicketType ticketType, string calldata tokenURI_) external onlyOwner returns (uint256 tokenId) {
        if (nextTokenId >= maxSupply) revert MintSoldOut();
        if (walletMinted[to] >= maxPerWallet) revert MaxPerWalletExceeded();

        tokenId = _mintTicket(to, ticketType, tokenURI_);
        emit TicketMinted(to, tokenId, ticketType);
    }

    function batchOrganizerMint(
        address[] calldata recipients,
        TicketType ticketType,
        string[] calldata tokenURIs
    ) external onlyOwner {
        require(recipients.length == tokenURIs.length, "Length mismatch");

        for (uint256 i = 0; i < recipients.length; i++) {
            if (nextTokenId >= maxSupply) revert MintSoldOut();
            if (walletMinted[recipients[i]] >= maxPerWallet) revert MaxPerWalletExceeded();

            uint256 tokenId = _mintTicket(recipients[i], ticketType, tokenURIs[i]);
            emit TicketMinted(recipients[i], tokenId, ticketType);
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

    function _mintTicket(address to, TicketType ticketType, string calldata tokenURI_) internal returns (uint256 tokenId) {
        walletMinted[to] += 1;
        tokenId = ++nextTokenId;

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI_);
        tokenIdToTicketType[tokenId] = ticketType;
        _setTokenRoyalty(tokenId, owner(), royaltyBps);
    }
}
