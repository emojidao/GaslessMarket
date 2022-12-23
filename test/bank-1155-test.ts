import { expect } from "chai";
import { ethers, upgrades } from "hardhat";

describe("Bank1155", function () {
    let ownerOfMarket, adminOfMarket, ownerOfNFT, renterA, renterB, other;
    let testERC1155;
    let bank;
    let market;

    beforeEach(async function () {
        [ownerOfMarket, adminOfMarket, ownerOfNFT, renterA, renterB, other] = await ethers.getSigners();
        const TestERC1155 = await ethers.getContractFactory("TestERC1155");
        testERC1155 = await TestERC1155.deploy();
        await testERC1155.mint(ownerOfNFT.address, 1, 1);

        const WrappedInERC5006 = await ethers.getContractFactory("WrappedInERC5006");
        let w5006Impl = await WrappedInERC5006.deploy();

        const Bank1155 = await ethers.getContractFactory("Bank1155");
        bank = await Bank1155.deploy(ownerOfMarket.address, adminOfMarket.address, w5006Impl.address);

        const RentalMarket1155 = await ethers.getContractFactory("RentalMarket1155");
        market = await RentalMarket1155.deploy();
        market = await upgrades.deployProxy(RentalMarket1155, [ownerOfMarket.address, adminOfMarket.address, bank.address], { unsafeAllow: ['delegatecall'] });

    })

    it("cannot bind anther market if market was bind", async function () {
        await expect(bank.connect(ownerOfMarket).bindMarket(other.address)).to.be.revertedWith("market was bind");
    });

    describe("W5006", function () {
        it("deploy w5006 should success if w5006 is not deployed nor registered", async function () {
            let w5006 = await bank.w5006Of(testERC1155.address);
            if (w5006 == ethers.constants.AddressZero) {
                await bank.deployW5006(testERC1155.address);
            }
        });

        it("register w5006 should success if w5006 is not deployed nor registered", async function () {
            let w5006 = await bank.w5006Of(testERC1155.address);
            if (w5006 == ethers.constants.AddressZero) {
                const WrappedInERC5006 = await ethers.getContractFactory("WrappedInERC5006");
                let w5006_1 = await WrappedInERC5006.deploy();
                await w5006_1.initializeWrap(testERC1155.address);
                await bank.connect(adminOfMarket).registerW5006(testERC1155.address, w5006_1.address);
            }
        });
        it("register w5006 should success if w5006 is not deployed nor registered", async function () {
            let w5006 = await bank.w5006Of(testERC1155.address);
            if (w5006 == ethers.constants.AddressZero) {
                const WrappedInERC5006 = await ethers.getContractFactory("WrappedInERC5006");
                let w5006_1 = await WrappedInERC5006.deploy();
                await w5006_1.initializeWrap(testERC1155.address);
                await bank.connect(ownerOfMarket).registerW5006(testERC1155.address, w5006_1.address);
            }
        });

        it("register w5006 should fail if caller is not admin nor owner", async function () {
            let w5006 = await bank.w5006Of(testERC1155.address);
            if (w5006 == ethers.constants.AddressZero) {
                const WrappedInERC5006 = await ethers.getContractFactory("WrappedInERC5006");
                let w5006_1 = await WrappedInERC5006.deploy();
                await w5006_1.initializeWrap(testERC1155.address);
                await expect(bank.connect(other).registerW5006(testERC1155.address, w5006_1.address)).to.be.revertedWith("onlyAdmin");
            }
        });

        it("deploy w5006 or register w5006 should fail if w5006 is deployed or registered", async function () {
            let w5006 = await bank.w5006Of(testERC1155.address);
            if (w5006 != ethers.constants.AddressZero) {
                await bank.deployW5006(testERC1155.address);
                await expect(bank.deployW5006(testERC1155.address)).to.be.revertedWith("w5006 is already exists");
                const WrappedInERC5006 = await ethers.getContractFactory("WrappedInERC5006");
                let w5006_1 = await WrappedInERC5006.deploy();
                await expect(bank.connect(adminOfMarket).registerW5006(testERC1155.address, w5006_1.address)).to.be.revertedWith("w5006 is already exists");
            }
        });
    });




});

