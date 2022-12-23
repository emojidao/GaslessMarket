import { expect } from "chai";
import { ethers } from "hardhat";

describe("Check Metadata", function () {
    let alice;
    const uri_1 = '100000001'
    const uri_2 = '200000002'
    let testERC1155
    let checker

    beforeEach(async function () {
        [alice] = await ethers.getSigners();
        const TestERC1155 = await ethers.getContractFactory("TestERC1155");
        testERC1155 = await TestERC1155.deploy();
        const MetadataChecker1155 = await ethers.getContractFactory("MetadataChecker1155");
        checker = await MetadataChecker1155.deploy();
        await testERC1155.setURI(uri_1);
        await testERC1155.mint(alice.address, 1,1);
    })

    it("hash_local equal hash_chain", async function () {
        let tokenURI = await testERC1155.uri(1);
        expect(tokenURI).equal(uri_1 + '1');
        let encode_local = ethers.utils.defaultAbiCoder.encode(['string'], [tokenURI]);
        let hash_local = ethers.utils.solidityKeccak256(['bytes'], [encode_local]);
        console.log('hash_local', hash_local);
        let data = await checker.check(testERC1155.address, 1, hash_local);
        expect(data).equal(true);
    });
    it("hash_local don't equal hash_chain if tokenURI change", async function () {
        let tokenURI = await testERC1155.uri(1);
        expect(tokenURI).equal(uri_1 + '1');
        let encode_local = ethers.utils.defaultAbiCoder.encode(['string'], [tokenURI]);
        let hash_local = ethers.utils.solidityKeccak256(['bytes'], [encode_local]);
        console.log('hash_local', hash_local);
        await testERC1155.setURI(uri_2);
        let data = await checker.check(testERC1155.address, 1, hash_local);
        expect(data).equal(false);
    });



});

