import pygame
import sys
from game.engine import GameEngine
from game.constants import SCREEN_WIDTH, SCREEN_HEIGHT, GAME_TITLE

def main():
    # Initialize pygame
    pygame.init()
    pygame.display.set_caption(GAME_TITLE)
    screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
    clock = pygame.time.Clock()
    
    # Create game engine
    game_engine = GameEngine(screen)
    
    # Main game loop
    while True:
        # Process events
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()
            game_engine.handle_event(event)
        
        # Update game state
        game_engine.update()
        
        # Render
        game_engine.render()
        
        # Update display
        pygame.display.flip()
        clock.tick(60)

if __name__ == "__main__":
    main() 