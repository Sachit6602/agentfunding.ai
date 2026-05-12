// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract TradeAttestation {
    address public immutable agent;

    event Attestation(
        address indexed agent,
        bytes32 indexed tradeId,
        string payload,
        uint256 indexed timestamp
    );

    mapping(bytes32 => bool) public attested;

    error Unauthorized();

    constructor(address _agent) {
        agent = _agent;
    }

    modifier onlyAgent() {
        if (msg.sender != agent) revert Unauthorized();
        _;
    }

    function attest(bytes32 tradeId, string calldata payload) external onlyAgent {
        attested[tradeId] = true;
        emit Attestation(msg.sender, tradeId, payload, block.timestamp);
    }

    function hasAttestation(bytes32 tradeId) external view returns (bool) {
        return attested[tradeId];
    }
}
