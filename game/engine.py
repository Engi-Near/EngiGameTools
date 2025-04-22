import pygame
from game.constants import STATE_MENU, STATE_PLAYING, STATE_PAUSED, STATE_VICTORY
from game.states.menu_state import MenuState
from game.states.playing_state import PlayingState
from game.states.paused_state import PausedState
from game.states.victory_state import VictoryState

class GameEngine:
    def __init__(self, screen):
        self.screen = screen
        self.running = True
        self.current_state = None
        
        # Initialize all states
        self.states = {
            STATE_MENU: MenuState(self),
            STATE_PLAYING: PlayingState(self),
            STATE_PAUSED: PausedState(self),
            STATE_VICTORY: VictoryState(self)
        }
        
        # Set initial state to menu
        self.change_state(STATE_MENU)
    
    def change_state(self, new_state):
        """Change the current game state"""
        if self.current_state:
            self.current_state.exit()
        
        self.current_state = self.states[new_state]
        self.current_state.enter()
    
    def handle_event(self, event):
        """Handle pygame events"""
        if self.current_state:
            self.current_state.handle_event(event)
    
    def update(self):
        """Update the current game state"""
        if self.current_state:
            self.current_state.update()
    
    def render(self):
        """Render the current game state"""
        if self.current_state:
            self.current_state.render(self.screen)
    
    def quit(self):
        """Quit the game"""
        self.running = False 