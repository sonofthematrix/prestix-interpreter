// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

interface IDistribution {
    function merkleRoot() external view returns (bytes32);

    function released(address _account) external view returns (bool);
}