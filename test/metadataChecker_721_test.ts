import { expect } from "chai";
import { ethers } from "hardhat";

describe("Check Metadata", function () {
    let alice;
    const uri_1 = '100000001'
    const uri_2 = '200000002'
    let testERC721
    let checker

    beforeEach(async function () {
        [alice] = await ethers.getSigners();
        const TestERC721 = await ethers.getContractFactory("TestERC721");
        testERC721 = await TestERC721.deploy();
        const MetadataChecker721 = await ethers.getContractFactory("MetadataChecker721");
        checker = await MetadataChecker721.deploy();
        await testERC721.setURI(uri_1);
        await testERC721.mint(alice.address, 1);
    })

    it("hash_local equal hash_chain", async function () {
        let tokenURI = await testERC721.tokenURI(1);
        expect(tokenURI).equal(uri_1 + '1');
        let encode_local = ethers.utils.defaultAbiCoder.encode(['string'], [tokenURI]);
        let hash_local = ethers.utils.solidityKeccak256(['bytes'], [encode_local]);
        console.log('hash_local', hash_local);
        let data = await checker.check(testERC721.address, 1, hash_local);
        expect(data).equal(true);
    });
    it("hash_local don't equal hash_chain if tokenURI change", async function () {
        let tokenURI = await testERC721.tokenURI(1);
        expect(tokenURI).equal(uri_1 + '1');
        let encode_local = ethers.utils.defaultAbiCoder.encode(['string'], [tokenURI]);
        let hash_local = ethers.utils.solidityKeccak256(['bytes'], [encode_local]);
        console.log('hash_local', hash_local);
        await testERC721.setURI(uri_2);
        let data = await checker.check(testERC721.address, 1, hash_local);
        expect(data).equal(false);
    });



});

