import pygame
from game.entities.entity import Entity
from game.constants import TILE_SIZE

class Building(Entity):
    def __init__(self, entity_id, building_type, x, y, is_player):
        super().__init__(entity_id, building_type, x, y, is_player)
        
        # Buildings can't move by default
        self.can_move = False
        self.construction_progress = 100  # Percentage complete
        self.is_completed = True
        
        # Configure building type specific attributes
        if building_type == "command_center":
            self.max_health = 1000
            self.health = 1000
            self.width = 3 * TILE_SIZE
            self.height = 3 * TILE_SIZE
            self.radius = int(max(self.width, self.height) / 2)
            self.production_options = ["worker"]
            self.production_cooldown = 0
            
        elif building_type == "barracks":
            self.max_health = 500
            self.health = 500
            self.width = 2 * TILE_SIZE
            self.height = 2 * TILE_SIZE
            self.radius = int(max(self.width, self.height) / 2)
            self.can_attack = False
            self.production_options = ["soldier"]
            self.production_cooldown = 0
            
        elif building_type == "factory":
            self.max_health = 800
            self.health = 800
            self.width = 3 * TILE_SIZE
            self.height = 2 * TILE_SIZE
            self.radius = int(max(self.width, self.height) / 2)
            self.can_attack = False
            self.production_options = ["tank"]
            self.production_cooldown = 0
            
        elif building_type == "turret":
            self.max_health = 300
            self.health = 300
            self.width = 1 * TILE_SIZE
            self.height = 1 * TILE_SIZE
            self.radius = int(max(self.width, self.height) / 2)
            self.can_attack = True
            self.attack_damage = 15
            self.attack_range = 150
            self.attack_cooldown = 0
            self.attack_cooldown_max = 30
            self.attack_target = None
            
    def start_production(self, unit_type):
        """Start producing a unit"""
        if unit_type in self.production_options and self.production_cooldown <= 0:
            self.current_production = unit_type
            
            # Set production time based on unit type
            if unit_type == "worker":
                self.production_cooldown = 180  # 3 seconds at 60 FPS
            elif unit_type == "soldier":
                self.production_cooldown = 300  # 5 seconds
            elif unit_type == "tank":
                self.production_cooldown = 480  # 8 seconds
                
            return True
        return False
        
    def update(self, entity_manager, game_map):
        """Update building logic"""
        # If under construction, progress the construction
        if not self.is_completed:
            self.construction_progress += 0.2  # 0.2% per frame
            if self.construction_progress >= 100:
                self.construction_progress = 100
                self.is_completed = True
                self.health = self.max_health
        
        # Handle production
        if hasattr(self, 'production_cooldown') and self.production_cooldown > 0:
            self.production_cooldown -= 1
            
            # Finished producing unit
            if self.production_cooldown <= 0 and hasattr(self, 'current_production'):
                # Find spawn position near the building
                spawn_x = int(self.x / TILE_SIZE) + 1
                spawn_y = int(self.y / TILE_SIZE) + 3
                
                # Create the unit
                entity_manager.create_unit(self.current_production, spawn_x, spawn_y, self.is_player)
                delattr(self, 'current_production')
                
        # Handle turret attacks
        if self.can_attack:
            # Decrease attack cooldown
            if self.attack_cooldown > 0:
                self.attack_cooldown -= 1
                
            # Find target if none
            if not hasattr(self, 'attack_target') or self.attack_target is None:
                # Find closest enemy in range
                closest_enemy = None
                closest_distance = self.attack_range
                
                for entity in entity_manager.entities:
                    if entity.is_player != self.is_player:
                        distance = self.distance_to(entity)
                        if distance < closest_distance:
                            closest_enemy = entity
                            closest_distance = distance
                
                self.attack_target = closest_enemy
                
            # Attack if target exists and in range
            if hasattr(self, 'attack_target') and self.attack_target:
                if self.attack_target in entity_manager.entities:
                    if self.distance_to(self.attack_target) <= self.attack_range:
                        if self.attack_cooldown <= 0:
                            # Deal damage
                            self.attack_target.apply_damage(self.attack_damage)
                            self.attack_cooldown = self.attack_cooldown_max
                    else:
                        # Target out of range
                        self.attack_target = None
                else:
                    # Target no longer exists
                    self.attack_target = None
        
    def render(self, screen, camera_x, camera_y):
        """Render the building on screen"""
        # Calculate screen position
        screen_x = int(self.x - camera_x)
        screen_y = int(self.y - camera_y)
        
        # Don't render if off screen
        if (screen_x + self.width < 0 or screen_x > screen.get_width() or
            screen_y + self.height < 0 or screen_y > screen.get_height()):
            return
            
        # Draw building
        color = (0, 200, 0) if self.is_player else (200, 0, 0)
        
        # If under construction, adjust opacity
        if not self.is_completed:
            # Draw as wireframe if under construction
            pygame.draw.rect(screen, color, (screen_x, screen_y, self.width, self.height), 2)
            
            # Draw construction progress bar
            progress_width = int(self.width * (self.construction_progress / 100))
            pygame.draw.rect(screen, (100, 100, 100), (screen_x, screen_y - 10, self.width, 5))
            pygame.draw.rect(screen, (200, 200, 0), (screen_x, screen_y - 10, progress_width, 5))
        else:
            # Draw completed building
            pygame.draw.rect(screen, color, (screen_x, screen_y, self.width, self.height))
            
            # Draw building type icon/symbol in the center
            building_symbol = "CC" if self.type == "command_center" else "B" if self.type == "barracks" else "F" if self.type == "factory" else "T"
            font = pygame.font.SysFont(None, 20)
            text = font.render(building_symbol, True, (0, 0, 0))
            text_rect = text.get_rect(center=(screen_x + self.width // 2, screen_y + self.height // 2))
            screen.blit(text, text_rect)
            
        # Draw health bar
        self.render_health_bar(screen, screen_x + self.width // 2, screen_y)
        
        # Draw production progress if producing
        if hasattr(self, 'production_cooldown') and hasattr(self, 'current_production') and self.production_cooldown > 0:
            # Calculate original cooldown based on unit type
            max_cooldown = 180  # Default
            if self.current_production == "soldier":
                max_cooldown = 300
            elif self.current_production == "tank":
                max_cooldown = 480
                
            # Draw production bar
            progress = (max_cooldown - self.production_cooldown) / max_cooldown
            bar_width = self.width
            progress_width = int(bar_width * progress)
            
            pygame.draw.rect(screen, (50, 50, 50), (screen_x, screen_y + self.height + 5, bar_width, 5))
            pygame.draw.rect(screen, (50, 150, 250), (screen_x, screen_y + self.height + 5, progress_width, 5)) 