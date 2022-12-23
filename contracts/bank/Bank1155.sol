// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Receiver.sol";
import "./Bank.sol";
import "./IBank1155.sol";
import "./W5006Factory.sol";
import "../erc5006/IWrappedInERC5006.sol";

contract Bank1155 is Bank, W5006Factory, ERC1155Receiver, IBank1155 {
    mapping(address => address) public oNFT_w5006;
    //               total amount
    mapping(bytes32 => uint256) internal frozenAmountMap;
    //                  amount
    mapping(bytes32 => uint256) internal rentingMap;

    constructor(
        address owner_,
        address admin_,
        address wNFTImpl_
    ) W5006Factory(owner_, admin_, wNFTImpl_) {}

    function _get5006(TokenType tokenType, address oNFT)
        internal
        view
        returns (address addr5006)
    {
        if (tokenType == TokenType.ERC5006) {
            addr5006 = oNFT;
        } else if (tokenType == TokenType.ERC1155) {
            addr5006 = oNFT_w5006[oNFT];
        } else {
            revert("invalid token type");
        }
    }

    function _frozenKey(
        address oNFT,
        uint256 oNFTId,
        address from
    ) internal pure returns (bytes32 key) {
        key = keccak256(abi.encode(oNFT, oNFTId, from));
    }

    function _rentingKey(
        address oNFT,
        uint256 oNFTId,
        address lender,
        uint256 recordId
    ) internal pure returns (bytes32 key) {
        key = keccak256(abi.encode(oNFT, oNFTId, lender, recordId));
    }

    function frozenAmountOf(
        address oNFT,
        uint256 oNFTId,
        address from
    ) external view returns (uint256) {
        bytes32 fkey = _frozenKey(oNFT, oNFTId, from);
        return frozenAmountMap[fkey];
    }

    function createUserRecord(RecordParam memory param) external {
        IERC1155(param.oNFT).safeTransferFrom(
            param.owner,
            address(this),
            param.oNFTId,
            param.oNFTAmount,
            ""
        );

        address addr5006 = _get5006(param.tokenType, param.oNFT);
        uint256 recordId;
        if (param.tokenType == TokenType.ERC5006) {
            recordId = IERC5006(addr5006).createUserRecord(
                address(this),
                param.user,
                param.oNFTId,
                uint64(param.oNFTAmount),
                uint64(param.expiry)
            );
        } else if (param.tokenType == TokenType.ERC1155) {
            recordId = IWrappedInERC5006(addr5006).stakeAndCreateUserRecord(
                param.oNFTId,
                uint64(param.oNFTAmount),
                param.user,
                uint64(param.expiry)
            );
        }

        param.recordId = recordId;
        bytes32 rentingKey = _rentingKey(
            param.oNFT,
            param.oNFTId,
            param.owner,
            recordId
        );
        rentingMap[rentingKey] = param.oNFTAmount;
        bytes32 fkey = _frozenKey(param.oNFT, param.oNFTId, param.owner);
        frozenAmountMap[fkey] += param.oNFTAmount;
        emit CreateUserRecord(param);
    }

    function _deleteUserRecord(RentingRecord calldata param) internal {
        address addr5006 = _get5006(param.tokenType, param.oNFT);
        IERC5006.UserRecord memory record = IERC5006(addr5006).userRecordOf(
            param.recordId
        );
        if (record.amount == 0) return;
        bytes32 rentingKey = _rentingKey(
            param.oNFT,
            param.oNFTId,
            param.lender,
            param.recordId
        );
        require(rentingMap[rentingKey] == record.amount, "invalid amount");
        if (param.tokenType == TokenType.ERC1155) {
            IWrappedInERC5006(addr5006).redeemRecord(
                param.recordId,
                param.lender
            );
        } else {
            IERC5006(addr5006).deleteUserRecord(param.recordId);
            IERC1155(param.oNFT).safeTransferFrom(
                address(this),
                record.owner,
                record.tokenId,
                record.amount,
                ""
            );
        }

        bytes32 fkey = _frozenKey(param.oNFT, param.oNFTId, param.lender);
        frozenAmountMap[fkey] -= record.amount;
        delete rentingMap[rentingKey];
        emit DeleteUserRecord(param);
    }

    function deleteUserRecords(RentingRecord[] calldata toDeletes) external {
        for (uint256 i = 0; i < toDeletes.length; i++) {
            _deleteUserRecord(toDeletes[i]);
        }
    }

    function deployW5006(address oNFT) public {
        require(oNFT_w5006[oNFT] == address(0), "deployed already");
        address w5006 = _deployW5006(oNFT);
        oNFT_w5006[oNFT] = w5006;
        IERC1155(oNFT).setApprovalForAll(w5006, true);
    }

    function registerW5006(address oNFT, address w5006) public onlyAdmin {
        require(oNFT_w5006[oNFT] == address(0), "deployed already");
        require(
            IERC165(w5006).supportsInterface(type(IWrappedIn).interfaceId),
            "not wNFT"
        );
        require(
            IERC165(w5006).supportsInterface(type(IERC5006).interfaceId),
            "not ERC5006"
        );
        require(
            IWrappedInERC5006(w5006).originalAddress() == oNFT,
            "invalid oNFT"
        );
        oNFT_w5006[oNFT] = w5006;
    }

    function w5006Of(address oNFT) public view returns (address) {
        return oNFT_w5006[oNFT];
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(IERC165, ERC1155Receiver)
        returns (bool)
    {
        return
            interfaceId == type(IBank1155).interfaceId ||
            ERC1155Receiver.supportsInterface(interfaceId);
    }

    function onERC1155Received(
        address operator,
        address from,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external pure override returns (bytes4) {
        return IERC1155Receiver.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address operator,
        address from,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    ) external pure override returns (bytes4) {
        return IERC1155Receiver.onERC1155BatchReceived.selector;
    }
}
