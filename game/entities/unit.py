import pygame
import math
from game.entities.entity import Entity

class Unit(Entity):
    def __init__(self, entity_id, unit_type, x, y, is_player):
        super().__init__(entity_id, unit_type, x, y, is_player)
        
        # Common attributes for all units
        self.can_move = True
        self.move_speed = 2.0
        self.target_x = None
        self.target_y = None
        self.attack_target = None
        
        # Configure unit type specific attributes
        if unit_type == "worker":
            self.max_health = 50
            self.health = 50
            self.can_attack = True
            self.attack_damage = 5
            self.attack_range = 20
            self.attack_cooldown_max = 45
            self.radius = 14
            
        elif unit_type == "soldier":
            self.max_health = 100
            self.health = 100
            self.can_attack = True
            self.attack_damage = 10
            self.attack_range = 25
            self.attack_cooldown_max = 30
            self.radius = 16
            
        elif unit_type == "tank":
            self.max_health = 200
            self.health = 200
            self.can_attack = True
            self.attack_damage = 20
            self.attack_range = 50
            self.move_speed = 1.5
            self.attack_cooldown_max = 60
            self.radius = 20
            
    def set_move_target(self, target_x, target_y):
        """Set the movement target for this unit"""
        self.target_x = target_x
        self.target_y = target_y
        self.attack_target = None  # Clear attack target when setting move target
        
    def set_attack_target(self, target_entity):
        """Set an entity as the attack target"""
        self.attack_target = target_entity
        self.target_x = target_entity.x
        self.target_y = target_entity.y
        
    def update(self, entity_manager, game_map):
        """Update unit logic"""
        # Decrease attack cooldown if attacking
        if self.attack_cooldown > 0:
            self.attack_cooldown -= 1
            
        # If has attack target, update its position or remove if dead
        if self.attack_target:
            if self.attack_target not in entity_manager.entities:
                self.attack_target = None
            else:
                self.target_x = self.attack_target.x
                self.target_y = self.attack_target.y
                
                # If in range, attack
                if self.can_attack and self.distance_to(self.attack_target) <= self.attack_range:
                    if self.attack_cooldown <= 0:
                        # Deal damage to the target
                        self.attack_target.apply_damage(self.attack_damage)
                        self.attack_cooldown = self.attack_cooldown_max
                        
        # Move towards target if not in attack range
        if self.target_x is not None and self.target_y is not None:
            if not self.attack_target or self.distance_to(self.attack_target) > self.attack_range:
                # Calculate direction to target
                dx = self.target_x - self.x
                dy = self.target_y - self.y
                distance = math.sqrt(dx * dx + dy * dy)
                
                # Move if not at target
                if distance > 5:
                    # Normalize direction
                    dx = dx / distance
                    dy = dy / distance
                    
                    # Calculate new position
                    new_x = self.x + dx * self.move_speed
                    new_y = self.y + dy * self.move_speed
                    
                    # Check for collisions
                    if not self.check_collision(new_x, new_y, entity_manager):
                        self.x = new_x
                        self.y = new_y
                else:
                    # Reached target, clear it
                    if not self.attack_target:
                        self.target_x = None
                        self.target_y = None
    
    def check_collision(self, new_x, new_y, entity_manager):
        """Check if moving to new position would cause a collision"""
        # Create temporary rect for new position
        new_rect = pygame.Rect(
            new_x - self.radius,
            new_y - self.radius,
            self.radius * 2,
            self.radius * 2
        )
        
        # Check collision with other entities
        for entity in entity_manager.entities:
            if entity.id != self.id:  # Don't collide with self
                entity_rect = pygame.Rect(
                    entity.x - entity.radius,
                    entity.y - entity.radius,
                    entity.radius * 2,
                    entity.radius * 2
                )
                if new_rect.colliderect(entity_rect):
                    return True
                    
        return False
    
    def render(self, screen, camera_x, camera_y):
        """Render the unit on screen"""
        super().render(screen, camera_x, camera_y)
        
        # Draw unit type-specific details
        screen_x = int(self.x - camera_x)
        screen_y = int(self.y - camera_y)
        
        # Only render details if on screen
        if (screen_x >= -self.radius and screen_x <= screen.get_width() + self.radius and
            screen_y >= -self.radius and screen_y <= screen.get_height() + self.radius):
            
            # Draw target line if moving
            if self.target_x is not None and self.target_y is not None:
                target_screen_x = int(self.target_x - camera_x)
                target_screen_y = int(self.target_y - camera_y)
                pygame.draw.line(screen, (200, 200, 0), (screen_x, screen_y), 
                                (target_screen_x, target_screen_y), 1) 