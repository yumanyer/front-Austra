// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import "../src/YPFOracle.sol";

/// @notice One-shot price push script (the recurring pusher will live in the backend).
contract PushPrice is Script {
    function run() external {
        // Backend wallet when available; falls back to the deployer for quick tests
        uint256 pusherKey = vm.envOr("PUSHER_PRIVATE_KEY", vm.envUint("DEPLOYER_PRIVATE_KEY"));
        address oracleAddr = vm.envAddress("ORACLE_CONTRACT_ADDRESS");

        // Reference price with 1e6 precision, e.g. PUSH_PRICE_USD6=42315000 -> $42.315
        uint256 price = vm.envUint("PUSH_PRICE_USD6");
        uint64 ts = uint64(block.timestamp);

        vm.startBroadcast(pusherKey);

        YPFOracle oracle = YPFOracle(oracleAddr);
        oracle.pushPrice(oracle.YPF(), price, ts);
        console2.log("Pushed YPF price:", price);
        console2.log("At timestamp:", ts);

        vm.stopBroadcast();
    }
}
