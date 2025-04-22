import pygame
from game.states.base_state import BaseState
from game.constants import STATE_PLAYING, STATE_MENU, COLOR_BLACK, COLOR_WHITE, SCREEN_WIDTH, SCREEN_HEIGHT

class PausedState(BaseState):
    def __init__(self, game_engine):
        super().__init__(game_engine)
        self.font = pygame.font.SysFont(None, 40)
        self.title_font = pygame.font.SysFont(None, 60)
        self.overlay = pygame.Surface((SCREEN_WIDTH, SCREEN_HEIGHT), pygame.SRCALPHA)
        self.overlay.fill((0, 0, 0, 128))  # Semi-transparent black
        self.options = ["Resume", "Save Game", "Load Game", "Options", "Return to Main Menu"]
        self.selected_option = 0
    
    def enter(self):
        self.selected_option = 0
    
    def handle_event(self, event):
        if event.type == pygame.KEYDOWN:
            if event.key == pygame.K_ESCAPE:
                # Return to game
                self.game_engine.change_state(STATE_PLAYING)
            elif event.key == pygame.K_UP:
                # Move selection up
                self.selected_option = (self.selected_option - 1) % len(self.options)
            elif event.key == pygame.K_DOWN:
                # Move selection down
                self.selected_option = (self.selected_option + 1) % len(self.options)
            elif event.key == pygame.K_RETURN:
                # Execute selected option
                self.execute_option(self.selected_option)
    
    def execute_option(self, option_index):
        option = self.options[option_index]
        
        if option == "Resume":
            self.game_engine.change_state(STATE_PLAYING)
        elif option == "Save Game":
            # Placeholder for save game functionality
            pass
        elif option == "Load Game":
            # Placeholder for load game functionality
            pass
        elif option == "Options":
            # Placeholder for options menu
            pass
        elif option == "Return to Main Menu":
            self.game_engine.change_state(STATE_MENU)
    
    def update(self):
        pass
    
    def render(self, screen):
        # The game is rendered behind the pause menu, so we don't clear the screen
        # Instead, we draw a semi-transparent overlay
        screen.blit(self.overlay, (0, 0))
        
        # Draw pause menu title
        title_surface = self.title_font.render("GAME PAUSED", True, COLOR_WHITE)
        title_rect = title_surface.get_rect(center=(SCREEN_WIDTH // 2, 150))
        screen.blit(title_surface, title_rect)
        
        # Draw menu options
        for i, option in enumerate(self.options):
            color = COLOR_WHITE
            if i == self.selected_option:
                # Highlight selected option
                pygame.draw.rect(screen, COLOR_WHITE, (
                    SCREEN_WIDTH // 2 - 150,
                    250 + i * 50 - 5,
                    300,
                    40
                ), 1)
            
            option_surface = self.font.render(option, True, color)
            option_rect = option_surface.get_rect(center=(SCREEN_WIDTH // 2, 250 + i * 50))
            screen.blit(option_surface, option_rect) 