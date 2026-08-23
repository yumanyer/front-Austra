// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IHyperOracle {
    function pushPrice(bytes32 symbol, uint256 price, uint64 timestamp) external;
    function latestPrice() external view returns (uint256 price, uint64 timestamp);
    function latestPriceFor(bytes32 symbol) external view returns (uint256 price, uint64 timestamp);
}
