// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import "../src/interfaces/IKinetiqLaunch.sol";

/// @notice Second step of the Kinetiq Launch lifecycle: activateMarket.
contract ActivateMarket is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        IKinetiqLaunch kinetiq = IKinetiqLaunch(vm.envAddress("KINETIQ_LAUNCH_ADDRESS"));
        string memory marketName = vm.envOr("MARKET_NAME", string("YPF-PERP"));

        vm.startBroadcast(deployerKey);

        kinetiq.activateMarket(marketName);
        console2.log("Kinetiq: activateMarket called for %s", marketName);

        vm.stopBroadcast();
    }
}
