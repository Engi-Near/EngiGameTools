import pygame
from game.states.base_state import BaseState
from game.constants import STATE_PLAYING, COLOR_BLACK, COLOR_WHITE, SCREEN_WIDTH, SCREEN_HEIGHT

class Button:
    def __init__(self, x, y, width, height, text, action):
        self.rect = pygame.Rect(x, y, width, height)
        self.text = text
        self.action = action
        self.hovered = False
    
    def draw(self, screen, font):
        color = (180, 180, 180) if self.hovered else (150, 150, 150)
        pygame.draw.rect(screen, color, self.rect)
        pygame.draw.rect(screen, COLOR_BLACK, self.rect, 2)  # Border
        
        text_surface = font.render(self.text, True, COLOR_BLACK)
        text_rect = text_surface.get_rect(center=self.rect.center)
        screen.blit(text_surface, text_rect)
    
    def check_hover(self, mouse_pos):
        self.hovered = self.rect.collidepoint(mouse_pos)
        return self.hovered
    
    def handle_click(self):
        if self.hovered:
            self.action()
            return True
        return False

class MenuState(BaseState):
    def __init__(self, game_engine):
        super().__init__(game_engine)
        self.font = pygame.font.SysFont(None, 40)
        self.title_font = pygame.font.SysFont(None, 80)
        self.buttons = []
    
    def enter(self):
        button_width = 200
        button_height = 50
        button_x = SCREEN_WIDTH // 2 - button_width // 2
        
        # Create menu buttons
        self.buttons = [
            Button(button_x, 250, button_width, button_height, "New Game", self.start_new_game),
            Button(button_x, 320, button_width, button_height, "Load Game", self.load_game),
            Button(button_x, 390, button_width, button_height, "Options", self.show_options),
            Button(button_x, 460, button_width, button_height, "Credits", self.show_credits),
            Button(button_x, 530, button_width, button_height, "Quit", self.quit_game)
        ]
    
    def handle_event(self, event):
        mouse_pos = pygame.mouse.get_pos()
        
        # Check for button hovers
        for button in self.buttons:
            button.check_hover(mouse_pos)
        
        if event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:  # Left click
            for button in self.buttons:
                button.handle_click()
    
    def update(self):
        pass
    
    def render(self, screen):
        # Fill the background
        screen.fill(COLOR_BLACK)
        
        # Draw title
        title_surface = self.title_font.render("GFLRTS", True, COLOR_WHITE)
        title_rect = title_surface.get_rect(center=(SCREEN_WIDTH // 2, 120))
        screen.blit(title_surface, title_rect)
        
        # Draw buttons
        for button in self.buttons:
            button.draw(screen, self.font)
    
    def start_new_game(self):
        self.game_engine.change_state(STATE_PLAYING)
    
    def load_game(self):
        # Placeholder for load game functionality
        pass
    
    def show_options(self):
        # Placeholder for options menu
        pass
    
    def show_credits(self):
        # Placeholder for credits screen
        pass
    
    def quit_game(self):
        pygame.quit()
        import sys
        sys.exit() 