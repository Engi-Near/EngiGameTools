import pygame
from game.states.base_state import BaseState
from game.constants import STATE_MENU, COLOR_BLACK, COLOR_WHITE, COLOR_BLUE, COLOR_GREEN, SCREEN_WIDTH, SCREEN_HEIGHT

class VictoryState(BaseState):
    def __init__(self, game_engine):
        super().__init__(game_engine)
        self.font = pygame.font.SysFont(None, 40)
        self.title_font = pygame.font.SysFont(None, 80)
        self.stats_font = pygame.font.SysFont(None, 30)
        
        # Stats placeholders - these would be filled with actual data from the game
        self.stats = {
            "Time played": "0:00",
            "Units created": 0,
            "Units lost": 0,
            "Units destroyed": 0,
            "Buildings constructed": 0,
            "Resources gathered": 0,
            "Score": 0
        }
        
        # Buttons
        self.buttons = [
            {"text": "Return to Main Menu", "action": self.return_to_menu},
            {"text": "Exit Game", "action": self.exit_game}
        ]
        self.selected_button = 0
        
    def enter(self):
        # Update stats from the playing state when entering victory screen
        playing_state = self.game_engine.states["playing"]
        
        # Calculate time played
        minutes = playing_state.elapsed_time // (60 * 60)  # Assuming 60 FPS
        seconds = (playing_state.elapsed_time // 60) % 60
        self.stats["Time played"] = f"{minutes}:{seconds:02d}"
        
        # Other stats would be gathered from the playing state
        # For now they're just placeholders
    
    def handle_event(self, event):
        if event.type == pygame.KEYDOWN:
            if event.key == pygame.K_UP:
                # Move selection up
                self.selected_button = (self.selected_button - 1) % len(self.buttons)
            elif event.key == pygame.K_DOWN:
                # Move selection down
                self.selected_button = (self.selected_button + 1) % len(self.buttons)
            elif event.key == pygame.K_RETURN:
                # Execute selected button action
                self.buttons[self.selected_button]["action"]()
        
        # Mouse selection
        if event.type == pygame.MOUSEMOTION:
            for i, button in enumerate(self.buttons):
                button_rect = self.get_button_rect(i)
                if button_rect.collidepoint(event.pos):
                    self.selected_button = i
                    
        if event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:  # Left click
            for i, button in enumerate(self.buttons):
                button_rect = self.get_button_rect(i)
                if button_rect.collidepoint(event.pos):
                    button["action"]()
    
    def get_button_rect(self, button_index):
        button_width = 300
        button_height = 50
        button_x = SCREEN_WIDTH // 2 - button_width // 2
        button_y = SCREEN_HEIGHT - 150 + button_index * 60
        return pygame.Rect(button_x, button_y, button_width, button_height)
    
    def return_to_menu(self):
        self.game_engine.change_state(STATE_MENU)
    
    def exit_game(self):
        pygame.quit()
        import sys
        sys.exit()
    
    def update(self):
        pass
    
    def render(self, screen):
        # Fill background
        screen.fill(COLOR_BLUE)
        
        # Create a decorative background pattern
        for i in range(0, SCREEN_WIDTH, 50):
            for j in range(0, SCREEN_HEIGHT, 50):
                if (i // 50 + j // 50) % 2 == 0:
                    pygame.draw.rect(screen, (70, 70, 180), (i, j, 50, 50))
        
        # Draw victory title
        title_surface = self.title_font.render("VICTORY!", True, COLOR_GREEN)
        title_rect = title_surface.get_rect(center=(SCREEN_WIDTH // 2, 100))
        screen.blit(title_surface, title_rect)
        
        # Draw congratulatory message
        message = "Congratulations! You have defeated all enemies!"
        message_surface = self.font.render(message, True, COLOR_WHITE)
        message_rect = message_surface.get_rect(center=(SCREEN_WIDTH // 2, 180))
        screen.blit(message_surface, message_rect)
        
        # Draw stats
        stats_y = 250
        for stat, value in self.stats.items():
            stat_text = f"{stat}: {value}"
            stat_surface = self.stats_font.render(stat_text, True, COLOR_WHITE)
            screen.blit(stat_surface, (SCREEN_WIDTH // 2 - 150, stats_y))
            stats_y += 30
        
        # Draw buttons
        for i, button in enumerate(self.buttons):
            button_rect = self.get_button_rect(i)
            button_color = (100, 200, 100) if i == self.selected_button else (80, 150, 80)
            
            pygame.draw.rect(screen, button_color, button_rect)
            pygame.draw.rect(screen, COLOR_BLACK, button_rect, 2)  # Border
            
            button_text = self.font.render(button["text"], True, COLOR_BLACK)
            button_text_rect = button_text.get_rect(center=button_rect.center)
            screen.blit(button_text, button_text_rect) 