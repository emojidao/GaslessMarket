import { expect } from "chai";
import { ethers } from "hardhat";
const firstTokenId = 1;
const secondTokenId = 2;

describe("Duration Key", function () {

    describe('key', function () {
        let hash_struct_chain = null;
        let hash_local = null;
        let addr = '0x1234567890123456789012345678901234567890'

        it("_hashStruct_NFT equal hashStruct_local", async function () {
            hash_struct_chain = ethers.utils.solidityKeccak256(['address','uint256','uint256'],[addr,100,22])
            hash_local = ethers.utils.solidityKeccak256(['address','uint256','uint256'],[addr,1002,2])
            expect(hash_local != hash_struct_chain).equal(true);
        });
    });



});

