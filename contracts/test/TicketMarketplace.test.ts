import { expect } from "chai";
import { ethers } from "hardhat";
import { EventFactory, EventTicketNFT, TicketMarketplace } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("TicketMarketplace", function () {
  let factory: EventFactory;
  let marketplace: TicketMarketplace;
  let eventNft: EventTicketNFT;
  let owner: SignerWithAddress;
  let organizer: SignerWithAddress;
  let buyer: SignerWithAddress;
  let seller: SignerWithAddress;
  let platformFeeRecipient: SignerWithAddress;

  const PLATFORM_FEE_BPS = 250; // 2.5%
  const ROYALTY_BPS = 500; // 5%
  const TICKET_PRICE = ethers.parseEther("1.0"); // Primary market price
  const LIST_PRICE = ethers.parseEther("2.0"); // Secondary market price

  beforeEach(async function () {
    [owner, organizer, buyer, seller, platformFeeRecipient] = await ethers.getSigners();

    // Deploy Factory
    const Factory = await ethers.getContractFactory("EventFactory");
    factory = await Factory.deploy();

    // Deploy Marketplace
    const Marketplace = await ethers.getContractFactory("TicketMarketplace");
    marketplace = await Marketplace.deploy(platformFeeRecipient.address, PLATFORM_FEE_BPS);

    // Create Event
    const tx = await factory.connect(organizer).createEvent({
      name: "Test Event",
      symbol: "TEST",
      tiers: [{ price: TICKET_PRICE, maxSupply: 100 }],
      royaltyBps: ROYALTY_BPS,
      maxPerWallet: 5,
    });

    const receipt = await tx.wait();
    const eventCreatedLog = receipt?.logs.find((log) => {
      try {
        return factory.interface.parseLog(log)?.name === "EventCreated";
      } catch {
        return false;
      }
    });

    const parsedLog = factory.interface.parseLog(eventCreatedLog!);
    const eventAddress = parsedLog?.args[1];

    eventNft = await ethers.getContractAt("EventTicketNFT", eventAddress);

    // Seller buys a ticket
    await eventNft.connect(seller).mint(0, "", { value: TICKET_PRICE });
  });

  describe("Listing and Buying", function () {
    it("should allow seller to list a ticket and buyer to purchase it with correct fee split", async function () {
      // 1. Approve Marketplace
      await eventNft.connect(seller).approve(await marketplace.getAddress(), 1);

      // 2. List Ticket
      await expect(marketplace.connect(seller).listTicket(await eventNft.getAddress(), 1, LIST_PRICE))
        .to.emit(marketplace, "TicketListed")
        .withArgs(seller.address, await eventNft.getAddress(), 1, LIST_PRICE);

      // Verify listing active
      const listingKey = await marketplace.listingKey(await eventNft.getAddress(), 1);
      let listing = await marketplace.listings(listingKey);
      expect(listing.active).to.be.true;
      expect(listing.price).to.equal(LIST_PRICE);

      // 3. Buyer purchases the ticket
      const platformFee = (LIST_PRICE * BigInt(PLATFORM_FEE_BPS)) / BigInt(10000);
      const royaltyFee = (LIST_PRICE * BigInt(ROYALTY_BPS)) / BigInt(10000);
      const sellerProceeds = LIST_PRICE - platformFee - royaltyFee;

      // Check balances before
      const platformBalBefore = await ethers.provider.getBalance(platformFeeRecipient.address);
      const organizerBalBefore = await ethers.provider.getBalance(organizer.address);
      const sellerBalBefore = await ethers.provider.getBalance(seller.address);

      const buyTx = await marketplace.connect(buyer).buyTicket(await eventNft.getAddress(), 1, { value: LIST_PRICE });
      const buyReceipt = await buyTx.wait();
      const gasUsed = buyReceipt!.gasUsed * buyReceipt!.gasPrice;

      // Check balances after
      const platformBalAfter = await ethers.provider.getBalance(platformFeeRecipient.address);
      const organizerBalAfter = await ethers.provider.getBalance(organizer.address);
      const sellerBalAfter = await ethers.provider.getBalance(seller.address);

      expect(platformBalAfter - platformBalBefore).to.equal(platformFee);
      // Note: Organizer's royalty goes directly to their wallet, not the event contract!
      expect(organizerBalAfter - organizerBalBefore).to.equal(royaltyFee);
      expect(sellerBalAfter - sellerBalBefore).to.equal(sellerProceeds);

      // Check ownership
      expect(await eventNft.ownerOf(1)).to.equal(buyer.address);

      // Check listing status
      listing = await marketplace.listings(listingKey);
      expect(listing.active).to.be.false;
    });

    it("should allow seller to update price", async function () {
      await eventNft.connect(seller).approve(await marketplace.getAddress(), 1);
      await marketplace.connect(seller).listTicket(await eventNft.getAddress(), 1, LIST_PRICE);

      const newPrice = ethers.parseEther("3.0");
      await expect(marketplace.connect(seller).updatePrice(await eventNft.getAddress(), 1, newPrice))
        .to.emit(marketplace, "ListingUpdated")
        .withArgs(seller.address, await eventNft.getAddress(), 1, newPrice);

      const listingKey = await marketplace.listingKey(await eventNft.getAddress(), 1);
      const listing = await marketplace.listings(listingKey);
      expect(listing.price).to.equal(newPrice);
    });

    it("should allow seller to cancel listing", async function () {
      await eventNft.connect(seller).approve(await marketplace.getAddress(), 1);
      await marketplace.connect(seller).listTicket(await eventNft.getAddress(), 1, LIST_PRICE);

      await expect(marketplace.connect(seller).cancelListing(await eventNft.getAddress(), 1))
        .to.emit(marketplace, "ListingCancelled")
        .withArgs(seller.address, await eventNft.getAddress(), 1);

      const listingKey = await marketplace.listingKey(await eventNft.getAddress(), 1);
      const listing = await marketplace.listings(listingKey);
      expect(listing.active).to.be.false;
    });
  });
});
