# GFLRTS - Real-Time Strategy Game

A simple RTS game with multiple game modes, including menu, gameplay, paused state, and victory screen.

## Features

- **Menu System**: Load saves, select game modes, check credits
- **Real-Time Gameplay**: Control units, build structures, gather resources
- **Pause Functionality**: Pause the game and access in-game menus
- **Victory Screen**: View game statistics after winning

## Game Entities

- **Units**: Workers, soldiers, and tanks with different capabilities
- **Buildings**: Command centers, barracks, factories, and turrets
- **Resources**: Gold for construction and unit production

## Controls

- **Left Click**: Select units
- **Shift + Left Click**: Add to selection
- **Right Click**: Move selected units or attack enemies
- **ESC**: Pause the game
- **Arrow Keys**: Move the camera

## Installation

1. Make sure you have Python 3.6+ installed
2. Install the required dependencies:

```
pip install -r requirements.txt
```

## Running the Game

To start the game, run:

```
python main.py
```

## Game Modes

- **Menu**: The starting screen where you can choose game options
- **In Game**: Active gameplay where you control units and construct buildings
- **Game Paused**: Pause menu that allows you to save/load or adjust settings
- **Victory**: Displayed when you defeat all enemies

## Development

This is a baseline implementation that can be extended with:

- More unit and building types
- Advanced AI for enemy behavior
- Improved graphics and animations
- Multiplayer functionality
- Campaign mode with missions

## Credits

Created as a fabrication baseline for an RTS game. 