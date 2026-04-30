import { expect } from "chai";
import { ethers } from "hardhat";

describe("EventFactory + EventTicketNFT", function () {
  async function deployFixture() {
    const [organizer, buyer, other] = await ethers.getSigners();

    const factoryFactory = await ethers.getContractFactory("EventFactory");
    const factory = await factoryFactory.connect(organizer).deploy();
    await factory.waitForDeployment();

    await factory.connect(organizer).createEvent({
      name: "TicketNFT Event",
      symbol: "TNFT",
      tiers: [
        { price: ethers.parseEther("0.01"), maxSupply: 2 },
        { price: ethers.parseEther("0.02"), maxSupply: 1 },
      ],
      royaltyBps: 500,
      maxPerWallet: 2,
    });

    const [eventAddress] = await factory.getEventsByOrganizer(organizer.address);
    const eventContract = await ethers.getContractAt("EventTicketNFT", eventAddress);

    return { factory, organizer, buyer, other, eventContract };
  }

  it("creates event contracts and tracks organizer mapping", async function () {
    const [organizer] = await ethers.getSigners();
    const factoryFactory = await ethers.getContractFactory("EventFactory");
    const factory = await factoryFactory.connect(organizer).deploy();
    await factory.waitForDeployment();

    await expect(
      factory.connect(organizer).createEvent({
        name: "TicketNFT Event",
        symbol: "TNFT",
        tiers: [
          { price: ethers.parseEther("0.01"), maxSupply: 80 },
          { price: ethers.parseEther("0.025"), maxSupply: 20 },
        ],
        royaltyBps: 500,
        maxPerWallet: 2,
      })
    ).to.emit(factory, "EventCreated");

    expect(await factory.totalEvents()).to.equal(1);

    const organizerEvents = await factory.getEventsByOrganizer(organizer.address);
    expect(organizerEvents).to.have.lengthOf(1);
  });

  it("stores tier configuration and derives total max supply", async function () {
    const { eventContract } = await deployFixture();

    expect(await eventContract.maxSupply()).to.equal(3);
    expect(await eventContract.tierCount()).to.equal(2);

    const tier0 = await eventContract.getTier(0);
    const tier1 = await eventContract.getTier(1);

    expect(tier0.price).to.equal(ethers.parseEther("0.01"));
    expect(tier0.maxSupply).to.equal(2);
    expect(tier0.minted).to.equal(0);
    expect(tier1.price).to.equal(ethers.parseEther("0.02"));
    expect(tier1.maxSupply).to.equal(1);
  });

  it("supports paid minting, tier accounting, check-in and transfer constraints", async function () {
    const { organizer, buyer, other, eventContract } = await deployFixture();

    await expect(
      eventContract
        .connect(buyer)
        .mint(0, "ipfs://metadata-1", { value: ethers.parseEther("0.01") })
    ).to.emit(eventContract, "TicketMinted");

    expect(await eventContract.ownerOf(1)).to.equal(buyer.address);
    expect(await eventContract.tokenIdToTierId(1)).to.equal(0);

    await expect(
      eventContract
        .connect(buyer)
        .mint(1, "ipfs://metadata-2", { value: ethers.parseEther("0.02") })
    ).to.not.be.reverted;

    const vipTier = await eventContract.getTier(1);
    expect(vipTier.minted).to.equal(1);

    await eventContract.connect(organizer).setTransferable(false);
    await expect(
      eventContract.connect(buyer).transferFrom(buyer.address, other.address, 1)
    ).to.be.revertedWithCustomError(eventContract, "TransfersDisabled");

    await eventContract.connect(organizer).setTransferable(true);
    await eventContract.connect(organizer).useTicket(1);

    await expect(
      eventContract.connect(buyer).transferFrom(buyer.address, other.address, 1)
    ).to.be.revertedWithCustomError(eventContract, "TransfersDisabled");
  });

  it("reverts on incorrect payment for selected tier", async function () {
    const { buyer, eventContract } = await deployFixture();

    await expect(
      eventContract
        .connect(buyer)
        .mint(1, "ipfs://metadata-1", { value: ethers.parseEther("0.01") })
    ).to.be.revertedWithCustomError(eventContract, "IncorrectPayment");
  });

  it("reverts when a tier is sold out even if other tiers remain", async function () {
    const { buyer, other, eventContract } = await deployFixture();

    await eventContract
      .connect(buyer)
      .mint(1, "ipfs://vip-1", { value: ethers.parseEther("0.02") });

    await expect(
      eventContract
        .connect(other)
        .mint(1, "ipfs://vip-2", { value: ethers.parseEther("0.02") })
    ).to.be.revertedWithCustomError(eventContract, "TierSoldOut");
  });

  it("reverts when global max supply is exceeded", async function () {
    const { organizer, buyer, other, eventContract } = await deployFixture();

    await eventContract
      .connect(buyer)
      .mint(0, "ipfs://m1", { value: ethers.parseEther("0.01") });

    await eventContract
      .connect(other)
      .mint(0, "ipfs://m2", { value: ethers.parseEther("0.01") });

    await eventContract
      .connect(organizer)
      .organizerMint(organizer.address, 1, "ipfs://m3");

    await expect(
      eventContract
        .connect(organizer)
        .organizerMint(organizer.address, 0, "ipfs://m4")
    ).to.be.revertedWithCustomError(eventContract, "MintSoldOut");
  });

  it("returns correct royalty info", async function () {
    const { organizer, buyer, eventContract } = await deployFixture();

    await eventContract
      .connect(buyer)
      .mint(0, "ipfs://m1", { value: ethers.parseEther("0.01") });

    const salePrice = ethers.parseEther("1");
    const [receiver, royaltyAmount] = await eventContract.royaltyInfo(1, salePrice);

    expect(receiver).to.equal(organizer.address);
    expect(royaltyAmount).to.equal(ethers.parseEther("0.05"));
  });

  it("withdraws funds to organizer", async function () {
    const { organizer, buyer, eventContract } = await deployFixture();

    await eventContract
      .connect(buyer)
      .mint(0, "ipfs://m1", { value: ethers.parseEther("0.01") });

    const contractAddress = await eventContract.getAddress();
    const before = await ethers.provider.getBalance(organizer.address);
    const tx = await eventContract.connect(organizer).withdraw();
    const receipt = await tx.wait();

    const gasUsed = receipt?.gasUsed ?? 0n;
    const gasPrice = receipt?.gasPrice ?? 0n;
    const gasCost = gasUsed * gasPrice;
    const after = await ethers.provider.getBalance(organizer.address);

    expect(await ethers.provider.getBalance(contractAddress)).to.equal(0n);
    expect(after + gasCost - before).to.equal(ethers.parseEther("0.01"));
  });

  it("reverts when using an already used ticket", async function () {
    const { organizer, buyer, eventContract } = await deployFixture();

    await eventContract
      .connect(buyer)
      .mint(0, "ipfs://m1", { value: ethers.parseEther("0.01") });

    await eventContract.connect(organizer).useTicket(1);

    await expect(
      eventContract.connect(organizer).useTicket(1)
    ).to.be.revertedWithCustomError(eventContract, "TicketAlreadyUsed");
  });
});
