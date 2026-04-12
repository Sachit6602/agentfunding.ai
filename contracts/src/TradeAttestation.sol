// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract TradeAttestation {
    event Attestation(
        address indexed agent,
        bytes32 indexed tradeId,
        string payload,
        uint256 timestamp
    );

    mapping(bytes32 => bool) public attested;

    function attest(bytes32 tradeId, string calldata payload) external {
        attested[tradeId] = true;
        emit Attestation(msg.sender, tradeId, payload, block.timestamp);
    }

    function hasAttestation(bytes32 tradeId) external view returns (bool) {
        return attested[tradeId];
    }
}
