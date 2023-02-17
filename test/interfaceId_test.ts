import { expect } from "chai";
import { ethers } from "hardhat";
import type { BigNumber, Wallet } from "ethers";
import { NFT, RentalPrice, LendOrder, TokenType, RentOffer, Metadata } from "./IStructs";
import { types_rentOffer, types_lendOrder } from "./types";

describe("Hash", function () {
    let contract;
    let w4907;

    beforeEach(async function () {
        const TestInterfaceId = await ethers.getContractFactory("TestInterfaceId");
        contract = await TestInterfaceId.deploy()

        const WrappedInERC4907Upgradeable = await ethers.getContractFactory("WrappedInERC4907Upgradeable");
        w4907 = await WrappedInERC4907Upgradeable.deploy()


    })

    describe('hash', function () {

        it("ids", async function () {
            let ids = await contract.interfaceIdOf();
            console.log(ids);
            
        });
        it("w4907", async function () {
            let bool = await w4907.supportsInterface("0xb72080fb");
            console.log(bool);
        });



    });



});

