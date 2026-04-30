// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC2981} from "@openzeppelin/contracts/interfaces/IERC2981.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract TicketMarketplace is ReentrancyGuard {
    struct Listing {
        address seller;
        address nft;
        uint256 tokenId;
        uint256 price;
        bool active;
    }

    uint96 public platformFeeBps;
    address public feeRecipient;

    mapping(bytes32 => Listing) public listings;

    event TicketListed(address indexed seller, address indexed nft, uint256 indexed tokenId, uint256 price);
    event ListingUpdated(address indexed seller, address indexed nft, uint256 indexed tokenId, uint256 newPrice);
    event ListingCancelled(address indexed seller, address indexed nft, uint256 indexed tokenId);
    event TicketSold(
        address indexed buyer,
        address indexed seller,
        address indexed nft,
        uint256 tokenId,
        uint256 price
    );

    constructor(address feeRecipient_, uint96 platformFeeBps_) {
        require(feeRecipient_ != address(0), "Invalid recipient");
        require(platformFeeBps_ <= 10_000, "Invalid fee");

        feeRecipient = feeRecipient_;
        platformFeeBps = platformFeeBps_;
    }

    function listingKey(address nft, uint256 tokenId) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(nft, tokenId));
    }

    function listTicket(address nft, uint256 tokenId, uint256 price) external {
        require(price > 0, "Invalid price");

        IERC721 token = IERC721(nft);
        require(token.ownerOf(tokenId) == msg.sender, "Not owner");
        require(
            token.getApproved(tokenId) == address(this) || token.isApprovedForAll(msg.sender, address(this)),
            "Marketplace not approved"
        );

        bytes32 key = listingKey(nft, tokenId);
        listings[key] = Listing({
            seller: msg.sender,
            nft: nft,
            tokenId: tokenId,
            price: price,
            active: true
        });

        emit TicketListed(msg.sender, nft, tokenId, price);
    }

    function cancelListing(address nft, uint256 tokenId) external {
        bytes32 key = listingKey(nft, tokenId);
        Listing storage item = listings[key];

        require(item.active, "Listing inactive");
        require(item.seller == msg.sender, "Not seller");

        item.active = false;
        emit ListingCancelled(msg.sender, nft, tokenId);
    }

    function updatePrice(address nft, uint256 tokenId, uint256 newPrice) external {
        require(newPrice > 0, "Invalid price");
        
        bytes32 key = listingKey(nft, tokenId);
        Listing storage item = listings[key];

        require(item.active, "Listing inactive");
        require(item.seller == msg.sender, "Not seller");

        item.price = newPrice;
        emit ListingUpdated(msg.sender, nft, tokenId, newPrice);
    }

    function buyTicket(address nft, uint256 tokenId) external payable nonReentrant {
        bytes32 key = listingKey(nft, tokenId);
        Listing storage item = listings[key];

        require(item.active, "Listing inactive");
        require(msg.value == item.price, "Incorrect payment");

        item.active = false;
        IERC721(item.nft).safeTransferFrom(item.seller, msg.sender, item.tokenId);

        uint256 platformFee = (msg.value * platformFeeBps) / 10000;
        
        uint256 royaltyAmount = 0;
        address royaltyReceiver = address(0);
        
        try IERC2981(item.nft).royaltyInfo(item.tokenId, msg.value) returns (address receiver, uint256 amount) {
            royaltyReceiver = receiver;
            royaltyAmount = amount;
        } catch {}

        uint256 sellerProceeds = msg.value - platformFee - royaltyAmount;

        if (platformFee > 0) {
            (bool feeOk, ) = feeRecipient.call{value: platformFee}("");
            require(feeOk, "Fee transfer failed");
        }

        if (royaltyAmount > 0 && royaltyReceiver != address(0)) {
            (bool royaltyOk, ) = royaltyReceiver.call{value: royaltyAmount}("");
            require(royaltyOk, "Royalty transfer failed");
        }

        (bool sellerOk, ) = item.seller.call{value: sellerProceeds}("");
        require(sellerOk, "Seller transfer failed");

        emit TicketSold(msg.sender, item.seller, item.nft, item.tokenId, item.price);
    }
}
