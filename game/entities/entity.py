import pygame
from game.constants import COLOR_GREEN, COLOR_RED, TILE_SIZE

class Entity:
    def __init__(self, entity_id, entity_type, x, y, is_player):
        self.id = entity_id
        self.type = entity_type
        self.x = x * TILE_SIZE  # Convert grid position to pixel position
        self.y = y * TILE_SIZE
        self.is_player = is_player
        self.radius = 16  # Default collision radius
        self.width = 32  # Default width
        self.height = 32  # Default height
        self.health = 100
        self.max_health = 100
        self.can_move = False
        self.can_attack = False
        self.attack_damage = 0
        self.attack_range = 0
        self.attack_cooldown = 0
        self.attack_cooldown_max = 60  # 1 second at 60 FPS
        
    def is_point_inside(self, point_x, point_y):
        """Check if a point is inside this entity"""
        # Simple circular collision
        dx = point_x - self.x
        dy = point_y - self.y
        return (dx * dx + dy * dy) <= (self.radius * self.radius)
        
    def is_inside_rect(self, rect):
        """Check if this entity is inside a rectangle"""
        entity_rect = pygame.Rect(
            self.x - self.radius, 
            self.y - self.radius,
            self.radius * 2, 
            self.radius * 2
        )
        return rect.colliderect(entity_rect)
        
    def distance_to(self, other_entity):
        """Calculate distance to another entity"""
        dx = other_entity.x - self.x
        dy = other_entity.y - self.y
        return (dx * dx + dy * dy) ** 0.5
        
    def distance_to_point(self, x, y):
        """Calculate distance to a point"""
        dx = x - self.x
        dy = y - self.y
        return (dx * dx + dy * dy) ** 0.5
        
    def apply_damage(self, damage):
        """Apply damage to this entity"""
        self.health -= damage
        if self.health < 0:
            self.health = 0
        return self.health <= 0
        
    def update(self, entity_manager, game_map):
        """Update entity state"""
        # Base entity has no update logic
        pass
        
    def render(self, screen, camera_x, camera_y):
        """Render entity on screen"""
        # Calculate screen position
        screen_x = int(self.x - camera_x)
        screen_y = int(self.y - camera_y)
        
        # Don't render if off screen
        if (screen_x < -self.width or screen_x > screen.get_width() or
            screen_y < -self.height or screen_y > screen.get_height()):
            return
            
        # Draw entity
        color = COLOR_GREEN if self.is_player else COLOR_RED
        pygame.draw.circle(screen, color, (screen_x, screen_y), self.radius)
        
        # Draw health bar
        self.render_health_bar(screen, screen_x, screen_y)
        
    def render_health_bar(self, screen, screen_x, screen_y):
        """Render health bar above entity"""
        bar_width = 32
        bar_height = 4
        bar_x = screen_x - bar_width // 2
        bar_y = screen_y - self.radius - 10
        
        # Background (empty health)
        pygame.draw.rect(screen, (60, 60, 60), (bar_x, bar_y, bar_width, bar_height))
        
        # Foreground (current health)
        health_width = int(bar_width * (self.health / self.max_health))
        health_color = (0, 255, 0) if self.health > self.max_health * 0.5 else (255, 0, 0)
        pygame.draw.rect(screen, health_color, (bar_x, bar_y, health_width, bar_height)) 