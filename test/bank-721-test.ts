import { expect } from "chai";
import { ethers, upgrades } from "hardhat";

describe("Bank721", function () {
    let ownerOfMarket, adminOfMarket, ownerOfNFT, renterA, renterB, other;
    let testERC721
    let market;
    let bank

    beforeEach(async function () {
        [ownerOfMarket, adminOfMarket, ownerOfNFT, renterA, renterB, other] = await ethers.getSigners();
        const TestERC721 = await ethers.getContractFactory("TestERC721");
        testERC721 = await TestERC721.deploy();
        await testERC721.mint(ownerOfNFT.address, 1);

        const WrappedInERC4907Upgradeable = await ethers.getContractFactory("WrappedInERC4907Upgradeable");
        let w4907 = await WrappedInERC4907Upgradeable.deploy();

        const Bank721 = await ethers.getContractFactory("Bank721");
        bank = await Bank721.deploy(ownerOfMarket.address, adminOfMarket.address, w4907.address);

        const RentalMarket721 = await ethers.getContractFactory("RentalMarket721");
        market = await RentalMarket721.deploy();
        market = await upgrades.deployProxy(RentalMarket721, [ownerOfMarket.address, adminOfMarket.address, bank.address], { unsafeAllow: ['delegatecall'] });

    })

    it("cannot bind anther market if market was bind", async function () {
        await expect(bank.connect(ownerOfMarket).bindMarket(other.address)).to.be.revertedWith("market was bind");
    });

    describe("W4907", function () {
        it("deploy w4907 should success if w4907 is not deployed nor registered", async function () {
            let w4907 = await bank.w4907Of(testERC721.address);
            if (w4907 == ethers.constants.AddressZero) {
                await bank.deployW4907('', '', testERC721.address);
            }
        });
        
        it("register w4907 should success if w4907 is not deployed nor registered", async function () {
            let w4907 = await bank.w4907Of(testERC721.address);
            if (w4907 == ethers.constants.AddressZero) {
                const WrappedInERC4907Upgradeable = await ethers.getContractFactory("WrappedInERC4907Upgradeable");
                let w4907_1 = await WrappedInERC4907Upgradeable.deploy();
                await w4907_1.initialize('','',testERC721.address,bank.address);
                await bank.connect(adminOfMarket).registerW4907(testERC721.address, w4907_1.address);
            }
        });
        it("register w4907 should success if w4907 is not deployed nor registered", async function () {
            let w4907 = await bank.w4907Of(testERC721.address);
            if (w4907 == ethers.constants.AddressZero) {
                const WrappedInERC4907Upgradeable = await ethers.getContractFactory("WrappedInERC4907Upgradeable");
                let w4907_1 = await WrappedInERC4907Upgradeable.deploy();
                await w4907_1.initialize('','',testERC721.address,bank.address);
                await bank.connect(ownerOfMarket).registerW4907(testERC721.address, w4907_1.address);
            }
        });

        it("register w4907 should fail if caller is not admin nor owner", async function () {
            let w4907 = await bank.w4907Of(testERC721.address);
            if (w4907 == ethers.constants.AddressZero) {
                const WrappedInERC4907Upgradeable = await ethers.getContractFactory("WrappedInERC4907Upgradeable");
                let w4907_1 = await WrappedInERC4907Upgradeable.deploy();
                await expect(bank.connect(other).registerW4907(testERC721.address, w4907_1.address)).to.be.revertedWith("onlyAdmin");
            }
        });

        it("deploy w4907 or register w4907 should fail if w4907 is deployed or registered", async function () {
            let w4907 = await bank.w4907Of(testERC721.address);
            if (w4907 != ethers.constants.AddressZero) {
                await bank.deployW4907('', '', testERC721.address);
                await expect(bank.deployW4907('', '', testERC721.address)).to.be.revertedWith("w4907 is already exists");
                const WrappedInERC4907Upgradeable = await ethers.getContractFactory("WrappedInERC4907Upgradeable");
                let w4907_1 = await WrappedInERC4907Upgradeable.deploy();
                await expect(bank.connect(adminOfMarket).registerW4907(testERC721.address, w4907_1.address)).to.be.revertedWith("w4907 is already exists");
            }
        });
    });




});

