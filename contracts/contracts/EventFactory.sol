// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {EventTicketNFT} from "./EventTicketNFT.sol";

contract EventFactory {
    struct EventConfig {
        string name;
        string symbol;
        uint256 maxSupply;
        uint256 ticketPrice;
        uint96 royaltyBps;
        uint256 maxPerWallet;
    }

    address[] public allEvents;
    mapping(address => address[]) public organizerToEvents;

    event EventCreated(address indexed organizer, address indexed eventContract, string name, string symbol);

    function createEvent(EventConfig calldata config) external returns (address eventContract) {
        EventTicketNFT deployed = new EventTicketNFT(
            config.name,
            config.symbol,
            msg.sender,
            config.maxSupply,
            config.ticketPrice,
            config.royaltyBps,
            config.maxPerWallet
        );

        eventContract = address(deployed);
        allEvents.push(eventContract);
        organizerToEvents[msg.sender].push(eventContract);

        emit EventCreated(msg.sender, eventContract, config.name, config.symbol);
    }

    function getEventsByOrganizer(address organizer) external view returns (address[] memory) {
        return organizerToEvents[organizer];
    }

    function getAllEvents() external view returns (address[] memory) {
        return allEvents;
    }

    function totalEvents() external view returns (uint256) {
        return allEvents.length;
    }
}
