// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

contract Proxy {
    address public implementation; // Address of the logic contract
    address public admin;          // Admin who can upgrade the logic contract

    constructor(address _implementation) {
        implementation = _implementation;
        admin = msg.sender;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    // Upgrade logic contract
    function upgradeImplementation(address _newImplementation) external onlyAdmin {
        implementation = _newImplementation;
    }

    // Fallback function delegates calls to logic contract
    fallback() external payable {
        address impl = implementation;
        require(impl != address(0), "Implementation not set");
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), impl, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }

    receive() external payable {}
}