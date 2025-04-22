import pygame
from game.states.base_state import BaseState
from game.constants import STATE_PAUSED, STATE_VICTORY, COLOR_GREEN, COLOR_BLUE, COLOR_BLACK
from game.entities.entity_manager import EntityManager
from game.map.game_map import GameMap

class PlayingState(BaseState):
    def __init__(self, game_engine):
        super().__init__(game_engine)
        self.entity_manager = EntityManager()
        self.game_map = GameMap()
        self.camera_x = 0
        self.camera_y = 0
        self.camera_speed = 10
        self.selected_entities = []
        self.selection_start = None
        self.selection_rect = None
        self.font = pygame.font.SysFont(None, 24)
        self.resources = {"gold": 1000, "wood": 500}
        self.elapsed_time = 0
        
    def enter(self):
        # Initialize or reset game state
        self.entity_manager.clear()
        self.game_map.generate_map()
        self.setup_initial_units()
        
    def setup_initial_units(self):
        # Create starting units and buildings for the player
        self.entity_manager.create_unit("worker", 10, 10, is_player=True)
        self.entity_manager.create_unit("worker", 12, 10, is_player=True)
        self.entity_manager.create_unit("worker", 14, 10, is_player=True)
        self.entity_manager.create_building("command_center", 5, 5, is_player=True)
        
        # Create some enemy units
        self.entity_manager.create_unit("worker", 40, 40, is_player=False)
        self.entity_manager.create_building("command_center", 45, 45, is_player=False)
        
    def handle_event(self, event):
        if event.type == pygame.KEYDOWN:
            if event.key == pygame.K_ESCAPE:
                self.game_engine.change_state(STATE_PAUSED)
                
        # Handle camera movement with arrow keys
        keys = pygame.key.get_pressed()
        if keys[pygame.K_LEFT]:
            self.camera_x -= self.camera_speed
        if keys[pygame.K_RIGHT]:
            self.camera_x += self.camera_speed
        if keys[pygame.K_UP]:
            self.camera_y -= self.camera_speed
        if keys[pygame.K_DOWN]:
            self.camera_y += self.camera_speed
            
        # Handle unit selection
        if event.type == pygame.MOUSEBUTTONDOWN:
            if event.button == 1:  # Left click
                self.handle_selection_start(event.pos)
        elif event.type == pygame.MOUSEBUTTONUP:
            if event.button == 1:  # Left click release
                self.handle_selection_end(event.pos)
            elif event.button == 3:  # Right click
                self.handle_command(event.pos)
                
        # Update selection rectangle if dragging
        if pygame.mouse.get_pressed()[0] and self.selection_start:
            current_pos = pygame.mouse.get_pos()
            self.selection_rect = self.calculate_selection_rect(self.selection_start, current_pos)
                
    def handle_selection_start(self, pos):
        self.selection_start = pos
        
        # Convert screen position to world position
        world_x = pos[0] + self.camera_x
        world_y = pos[1] + self.camera_y
        
        # Check if clicked directly on an entity
        clicked_entity = self.entity_manager.get_entity_at_position(world_x, world_y)
        
        if clicked_entity and clicked_entity.is_player:
            # If shift is not held, clear current selection
            if not pygame.key.get_mods() & pygame.KMOD_SHIFT:
                self.selected_entities = []
            
            # Add to selection if not already selected
            if clicked_entity not in self.selected_entities:
                self.selected_entities.append(clicked_entity)
        elif not pygame.key.get_mods() & pygame.KMOD_SHIFT:
            # Clear selection if not adding to selection
            self.selected_entities = []
            
    def handle_selection_end(self, pos):
        if not self.selection_start:
            return
            
        end_pos = pos
        
        # If selection rect is valid, select all entities in it
        if self.selection_rect:
            # Convert screen rect to world rect
            world_rect = pygame.Rect(
                self.selection_rect.x + self.camera_x,
                self.selection_rect.y + self.camera_y,
                self.selection_rect.width,
                self.selection_rect.height
            )
            
            # If shift is not held, clear current selection
            if not pygame.key.get_mods() & pygame.KMOD_SHIFT:
                self.selected_entities = []
                
            # Add all player entities in the selection rectangle
            for entity in self.entity_manager.get_entities_in_rect(world_rect):
                if entity.is_player and entity not in self.selected_entities:
                    self.selected_entities.append(entity)
                    
        # Reset selection state
        self.selection_start = None
        self.selection_rect = None
        
    def handle_command(self, pos):
        if not self.selected_entities:
            return
            
        # Convert screen position to world position
        world_x = pos[0] + self.camera_x
        world_y = pos[1] + self.camera_y
        
        # Check if clicked on an enemy to attack
        target = self.entity_manager.get_entity_at_position(world_x, world_y)
        
        for entity in self.selected_entities:
            if entity.can_move:
                if target and not target.is_player:
                    # Attack target
                    entity.set_attack_target(target)
                else:
                    # Move to position
                    entity.set_move_target(world_x, world_y)
        
    def calculate_selection_rect(self, start, end):
        x = min(start[0], end[0])
        y = min(start[1], end[1])
        width = abs(start[0] - end[0])
        height = abs(start[1] - end[1])
        return pygame.Rect(x, y, width, height)
        
    def update(self):
        # Update elapsed game time
        self.elapsed_time += 1
        
        # Check win/loss conditions
        if self.check_victory_condition():
            self.game_engine.change_state(STATE_VICTORY)
            
        # Update all entities
        self.entity_manager.update(self.game_map)
        
    def check_victory_condition(self):
        # Simple victory condition: destroy all enemy buildings
        return len(self.entity_manager.get_enemy_buildings()) == 0
        
    def render(self, screen):
        # Fill background
        screen.fill(COLOR_BLACK)
        
        # Render map
        self.game_map.render(screen, self.camera_x, self.camera_y)
        
        # Render entities
        self.entity_manager.render(screen, self.camera_x, self.camera_y)
        
        # Render selection rectangle if active
        if self.selection_rect:
            pygame.draw.rect(screen, COLOR_GREEN, self.selection_rect, 1)
            
        # Render selection indicators
        for entity in self.selected_entities:
            rect = pygame.Rect(
                entity.x - self.camera_x - entity.radius,
                entity.y - self.camera_y - entity.radius,
                entity.radius * 2,
                entity.radius * 2
            )
            pygame.draw.rect(screen, COLOR_GREEN, rect, 2)
            
        # Render UI
        self.render_ui(screen)
        
    def render_ui(self, screen):
        # Render resources
        gold_text = f"Gold: {self.resources['gold']}"
        wood_text = f"Wood: {self.resources['wood']}"
        
        gold_surface = self.font.render(gold_text, True, COLOR_GREEN)
        wood_surface = self.font.render(wood_text, True, COLOR_GREEN)
        
        screen.blit(gold_surface, (10, 10))
        screen.blit(wood_surface, (10, 40))
        
        # Render selected entity info
        if len(self.selected_entities) == 1:
            entity = self.selected_entities[0]
            info_text = f"{entity.type} - HP: {entity.health}/{entity.max_health}"
            info_surface = self.font.render(info_text, True, COLOR_BLUE)
            screen.blit(info_surface, (10, 70)) 