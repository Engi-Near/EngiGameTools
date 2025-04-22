import pygame
import random
from game.constants import TILE_SIZE, MAP_WIDTH, MAP_HEIGHT

class GameMap:
    # Tile types
    TILE_GRASS = 0
    TILE_WATER = 1
    TILE_MOUNTAIN = 2
    TILE_FOREST = 3
    TILE_GOLD = 4
    
    def __init__(self):
        self.width = MAP_WIDTH
        self.height = MAP_HEIGHT
        self.tiles = [[self.TILE_GRASS for y in range(self.height)] for x in range(self.width)]
        self.tile_colors = {
            self.TILE_GRASS: (100, 200, 100),
            self.TILE_WATER: (50, 150, 255),
            self.TILE_MOUNTAIN: (150, 150, 150),
            self.TILE_FOREST: (0, 100, 0),
            self.TILE_GOLD: (255, 215, 0)
        }
        
    def generate_map(self):
        """Generate a random map"""
        # Start with all grass
        self.tiles = [[self.TILE_GRASS for y in range(self.height)] for x in range(self.width)]
        
        # Add water bodies
        self.generate_noise_based_features(self.TILE_WATER, 0.2, 0.3, 10)
        
        # Add mountains
        self.generate_noise_based_features(self.TILE_MOUNTAIN, 0.1, 0.4, 8)
        
        # Add forests
        self.generate_noise_based_features(self.TILE_FOREST, 0.15, 0.6, 12)
        
        # Add gold resources
        self.generate_resources(self.TILE_GOLD, 15)
        
    def generate_noise_based_features(self, tile_type, coverage, threshold, smoothing):
        """Generate map features using noise"""
        # Create noise map
        noise = [[random.random() for y in range(self.height)] for x in range(self.width)]
        
        # Smooth the noise
        for _ in range(smoothing):
            smoothed = [[0 for y in range(self.height)] for x in range(self.width)]
            for x in range(self.width):
                for y in range(self.height):
                    # Get neighboring values
                    neighbors = []
                    for dx in [-1, 0, 1]:
                        for dy in [-1, 0, 1]:
                            nx, ny = x + dx, y + dy
                            if 0 <= nx < self.width and 0 <= ny < self.height:
                                neighbors.append(noise[nx][ny])
                    # Set smoothed value to average of neighbors
                    smoothed[x][y] = sum(neighbors) / len(neighbors)
            noise = smoothed
        
        # Apply noise to create features
        for x in range(self.width):
            for y in range(self.height):
                if noise[x][y] < coverage and random.random() < threshold:
                    self.tiles[x][y] = tile_type
                    
    def generate_resources(self, resource_type, count):
        """Place resources at random locations"""
        placed = 0
        attempts = 0
        
        while placed < count and attempts < 100:
            x = random.randint(0, self.width - 1)
            y = random.randint(0, self.height - 1)
            
            # Only place on grass
            if self.tiles[x][y] == self.TILE_GRASS:
                self.tiles[x][y] = resource_type
                placed += 1
            
            attempts += 1
            
    def is_passable(self, x, y):
        """Check if a tile is passable"""
        # Convert to tile coordinates
        tile_x = int(x / TILE_SIZE)
        tile_y = int(y / TILE_SIZE)
        
        # Check if out of bounds
        if not (0 <= tile_x < self.width and 0 <= tile_y < self.height):
            return False
            
        # Check if tile is passable
        tile_type = self.tiles[tile_x][tile_y]
        return tile_type != self.TILE_WATER and tile_type != self.TILE_MOUNTAIN
        
    def get_tile_type(self, x, y):
        """Get the type of tile at the given coordinates"""
        # Convert to tile coordinates
        tile_x = int(x / TILE_SIZE)
        tile_y = int(y / TILE_SIZE)
        
        # Check if out of bounds
        if not (0 <= tile_x < self.width and 0 <= tile_y < self.height):
            return -1
            
        return self.tiles[tile_x][tile_y]
        
    def render(self, screen, camera_x, camera_y):
        """Render the visible portion of the map"""
        # Calculate visible tile range
        start_x = max(0, int(camera_x / TILE_SIZE))
        start_y = max(0, int(camera_y / TILE_SIZE))
        end_x = min(self.width, start_x + int(screen.get_width() / TILE_SIZE) + 2)
        end_y = min(self.height, start_y + int(screen.get_height() / TILE_SIZE) + 2)
        
        # Render visible tiles
        for x in range(start_x, end_x):
            for y in range(start_y, end_y):
                # Calculate screen position
                screen_x = int(x * TILE_SIZE - camera_x)
                screen_y = int(y * TILE_SIZE - camera_y)
                
                # Get tile color
                tile_type = self.tiles[x][y]
                tile_color = self.tile_colors[tile_type]
                
                # Draw tile
                pygame.draw.rect(screen, tile_color, (screen_x, screen_y, TILE_SIZE, TILE_SIZE))
                
                # Draw tile border
                pygame.draw.rect(screen, (50, 50, 50), (screen_x, screen_y, TILE_SIZE, TILE_SIZE), 1)
                
                # Draw special tile indicators
                if tile_type == self.TILE_GOLD:
                    # Draw gold symbol
                    gold_color = (255, 200, 0)
                    radius = TILE_SIZE // 4
                    pygame.draw.circle(screen, gold_color, 
                                     (screen_x + TILE_SIZE // 2, screen_y + TILE_SIZE // 2), radius)
                
                elif tile_type == self.TILE_FOREST:
                    # Draw simple tree
                    tree_color = (0, 80, 0)
                    trunk_color = (100, 50, 0)
                    
                    # Tree trunk
                    pygame.draw.rect(screen, trunk_color, (
                        screen_x + TILE_SIZE // 2 - 2,
                        screen_y + TILE_SIZE // 2,
                        4,
                        TILE_SIZE // 2 - 2
                    ))
                    
                    # Tree crown
                    pygame.draw.circle(screen, tree_color, 
                                     (screen_x + TILE_SIZE // 2, screen_y + TILE_SIZE // 3), TILE_SIZE // 3)
                
                elif tile_type == self.TILE_MOUNTAIN:
                    # Draw mountain symbol
                    pygame.draw.polygon(screen, (120, 120, 120), [
                        (screen_x + TILE_SIZE // 2, screen_y + 4),
                        (screen_x + 4, screen_y + TILE_SIZE - 4),
                        (screen_x + TILE_SIZE - 4, screen_y + TILE_SIZE - 4)
                    ]) 