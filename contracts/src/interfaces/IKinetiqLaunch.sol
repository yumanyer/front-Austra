// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @notice Simplified interface for the Kinetiq Launch market lifecycle.
/// @dev Rehearsal flow for the austral.fi hackathon MVP:
///      deployMarket -> activateMarket -> bondMarket -> fund -> launch.
///      When integrating against the real Kinetiq EXFactory on HyperEVM,
///      replace this interface (real ABI uses MarketParams, marketId and
///      msg.value bonds) without touching consumers of the flow scripts.
interface IKinetiqLaunch {
    function deployMarket(string calldata name, string calldata underlying, uint8 maxLeverage) external;

    function activateMarket(string calldata name) external;

    function bondMarket(string calldata name) external;

    function fund(string calldata name) external;

    function launch(string calldata name) external;
}
