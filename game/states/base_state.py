class BaseState:
    def __init__(self, game_engine):
        self.game_engine = game_engine
    
    def enter(self):
        """Called when entering the state"""
        pass
    
    def exit(self):
        """Called when exiting the state"""
        pass
    
    def handle_event(self, event):
        """Handle pygame events"""
        pass
    
    def update(self):
        """Update state logic"""
        pass
    
    def render(self, screen):
        """Render the state"""
        pass 