from game.entities.entity import Entity
from game.entities.unit import Unit
from game.entities.building import Building

class EntityManager:
    def __init__(self):
        self.entities = []
        self.entity_id_counter = 0
        
    def clear(self):
        """Clear all entities"""
        self.entities = []
        
    def create_unit(self, unit_type, x, y, is_player=True):
        """Create a new unit at the given position"""
        unit = Unit(self.entity_id_counter, unit_type, x, y, is_player)
        self.entities.append(unit)
        self.entity_id_counter += 1
        return unit
        
    def create_building(self, building_type, x, y, is_player=True):
        """Create a new building at the given position"""
        building = Building(self.entity_id_counter, building_type, x, y, is_player)
        self.entities.append(building)
        self.entity_id_counter += 1
        return building
        
    def get_entity_at_position(self, x, y):
        """Get entity at the specified position"""
        for entity in self.entities:
            if entity.is_point_inside(x, y):
                return entity
        return None
        
    def get_entities_in_rect(self, rect):
        """Get all entities inside the specified rectangle"""
        result = []
        for entity in self.entities:
            if entity.is_inside_rect(rect):
                result.append(entity)
        return result
    
    def get_player_entities(self):
        """Get all player entities"""
        return [e for e in self.entities if e.is_player]
        
    def get_enemy_entities(self):
        """Get all enemy entities"""
        return [e for e in self.entities if not e.is_player]
        
    def get_player_buildings(self):
        """Get all player buildings"""
        return [e for e in self.entities if e.is_player and isinstance(e, Building)]
        
    def get_enemy_buildings(self):
        """Get all enemy buildings"""
        return [e for e in self.entities if not e.is_player and isinstance(e, Building)]
        
    def update(self, game_map):
        """Update all entities"""
        # Create a copy of entities to allow removal during iteration
        entities_copy = self.entities.copy()
        
        for entity in entities_copy:
            entity.update(self, game_map)
            
            # Remove dead entities
            if entity.health <= 0:
                self.entities.remove(entity)
                
    def render(self, screen, camera_x, camera_y):
        """Render all entities"""
        # Sort entities by y position for proper z-ordering
        sorted_entities = sorted(self.entities, key=lambda e: e.y)
        
        for entity in sorted_entities:
            entity.render(screen, camera_x, camera_y) 