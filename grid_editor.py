import sys
import os
import numpy as np
from PyQt6.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout,
                           QHBoxLayout, QPushButton, QFileDialog, QScrollArea)
from PyQt6.QtCore import Qt, QRect
from PyQt6.QtGui import QPainter, QColor, QPen, QMouseEvent, QKeyEvent

# Set the platform plugin path
import site
python_path = site.getsitepackages()[0]
os.environ['QT_QPA_PLATFORM_PLUGIN_PATH'] = os.path.join(python_path, 'PyQt6', 'Qt6', 'plugins')

class GridWidget(QWidget):
    def __init__(self, size=64):
        super().__init__()
        self.size = size
        self.grid = np.zeros((size, size), dtype=bool)
        self.zoom_factor = 1.0
        self.setMinimumSize(size * 20, size * 20)  # Initial size with 20px per cell
        self.setFocusPolicy(Qt.FocusPolicy.StrongFocus)  # Enable keyboard focus
        
        # Drag mode variables
        self.is_dragging = False
        self.drag_start = None
        self.drag_end = None
        self.is_line_mode = True  # True for line mode, False for plane mode
        self.drag_mode = "invert"  # "invert", "add", or "remove"
        
    def _get_preview_color(self, is_black):
        if self.drag_mode == "add":
            return QColor(0, 255, 0) if not is_black else None
        elif self.drag_mode == "remove":
            return QColor(255, 0, 0) if is_black else None
        else:  # invert mode
            return QColor(255, 0, 0) if is_black else QColor(0, 255, 0)
    
    def _should_flip_cell(self, is_black):
        if self.drag_mode == "add":
            return not is_black
        elif self.drag_mode == "remove":
            return is_black
        else:  # invert mode
            return True
    
    def paintEvent(self, event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        
        # Calculate cell size based on zoom
        cell_size = 20 * self.zoom_factor
        
        # Draw grid
        for i in range(self.size):
            for j in range(self.size):
                x = j * cell_size
                y = i * cell_size
                
                # Draw cell
                if self.grid[i, j]:
                    painter.fillRect(x, y, cell_size, cell_size, QColor(0, 0, 0))
                else:
                    painter.fillRect(x, y, cell_size, cell_size, QColor(255, 255, 255))
                
                # Draw grid lines
                painter.setPen(QPen(QColor(200, 200, 200)))
                painter.drawRect(x, y, cell_size, cell_size)
        
        # Draw preview if dragging
        if self.is_dragging and self.drag_start and self.drag_end:
            start_x, start_y = self.drag_start
            end_x, end_y = self.drag_end
            
            if self.is_line_mode:
                # Draw line preview
                self._draw_line_preview(painter, start_x, start_y, end_x, end_y, cell_size)
            else:
                # Draw rectangle preview
                self._draw_rectangle_preview(painter, start_x, start_y, end_x, end_y, cell_size)
    
    def _draw_line_preview(self, painter, start_x, start_y, end_x, end_y, cell_size):
        # Bresenham's line algorithm
        x1, y1 = start_x, start_y
        x2, y2 = end_x, end_y
        dx = abs(x2 - x1)
        dy = abs(y2 - y1)
        x, y = x1, y1
        n = 1 + dx + dy
        x_inc = 1 if x2 > x1 else -1
        y_inc = 1 if y2 > y1 else -1
        error = dx - dy
        dx *= 2
        dy *= 2

        for _ in range(n):
            if 0 <= x < self.size and 0 <= y < self.size:
                color = self._get_preview_color(self.grid[y, x])
                if color:
                    painter.fillRect(x * cell_size, y * cell_size, cell_size, cell_size, color)
            if error > 0:
                x += x_inc
                error -= dy
            else:
                y += y_inc
                error += dx
    
    def _draw_rectangle_preview(self, painter, start_x, start_y, end_x, end_y, cell_size):
        min_x = min(start_x, end_x)
        max_x = max(start_x, end_x)
        min_y = min(start_y, end_y)
        max_y = max(start_y, end_y)
        
        for y in range(min_y, max_y + 1):
            for x in range(min_x, max_x + 1):
                if 0 <= x < self.size and 0 <= y < self.size:
                    color = self._get_preview_color(self.grid[y, x])
                    if color:
                        painter.fillRect(x * cell_size, y * cell_size, cell_size, cell_size, color)
    
    def _apply_drag(self):
        if not self.drag_start or not self.drag_end:
            return
            
        start_x, start_y = self.drag_start
        end_x, end_y = self.drag_end
        
        if self.is_line_mode:
            # Apply line using Bresenham's algorithm
            x1, y1 = start_x, start_y
            x2, y2 = end_x, end_y
            dx = abs(x2 - x1)
            dy = abs(y2 - y1)
            x, y = x1, y1
            n = 1 + dx + dy
            x_inc = 1 if x2 > x1 else -1
            y_inc = 1 if y2 > y1 else -1
            error = dx - dy
            dx *= 2
            dy *= 2

            for _ in range(n):
                if 0 <= x < self.size and 0 <= y < self.size:
                    if self._should_flip_cell(self.grid[y, x]):
                        self.grid[y, x] = not self.grid[y, x]
                if error > 0:
                    x += x_inc
                    error -= dy
                else:
                    y += y_inc
                    error += dx
        else:
            # Apply rectangle
            min_x = min(start_x, end_x)
            max_x = max(start_x, end_x)
            min_y = min(start_y, end_y)
            max_y = max(start_y, end_y)
            
            for y in range(min_y, max_y + 1):
                for x in range(min_x, max_x + 1):
                    if 0 <= x < self.size and 0 <= y < self.size:
                        if self._should_flip_cell(self.grid[y, x]):
                            self.grid[y, x] = not self.grid[y, x]
    
    def mousePressEvent(self, event: QMouseEvent):
        if event.button() == Qt.MouseButton.LeftButton:
            cell_size = 20 * self.zoom_factor
            x = int(event.position().x() // cell_size)
            y = int(event.position().y() // cell_size)
            
            if 0 <= x < self.size and 0 <= y < self.size:
                self.is_dragging = True
                self.drag_start = (x, y)
                self.drag_end = (x, y)
                self.update()
    
    def mouseMoveEvent(self, event: QMouseEvent):
        if self.is_dragging:
            cell_size = 20 * self.zoom_factor
            x = int(event.position().x() // cell_size)
            y = int(event.position().y() // cell_size)
            
            if 0 <= x < self.size and 0 <= y < self.size:
                self.drag_end = (x, y)
                self.update()
    
    def mouseReleaseEvent(self, event: QMouseEvent):
        if event.button() == Qt.MouseButton.LeftButton and self.is_dragging:
            self._apply_drag()
            self.is_dragging = False
            self.drag_start = None
            self.drag_end = None
            self.update()
    
    def keyPressEvent(self, event: QKeyEvent):
        if event.key() == Qt.Key.Key_Plus or event.key() == Qt.Key.Key_Equal:
            self.zoom_factor *= 1.1
        elif event.key() == Qt.Key.Key_Minus:
            self.zoom_factor /= 1.1
        elif event.key() == Qt.Key.Key_E:
            self.is_line_mode = not self.is_line_mode
            self.update()
        elif event.key() == Qt.Key.Key_1:
            self.drag_mode = "add"
            self.update()
        elif event.key() == Qt.Key.Key_2:
            self.drag_mode = "remove"
            self.update()
        elif event.key() == Qt.Key.Key_3:
            self.drag_mode = "invert"
            self.update()
        
        # Limit zoom range
        self.zoom_factor = max(0.1, min(5.0, self.zoom_factor))
        event.accept()
    
    def get_bounds(self):
        # Find all black squares (where grid is True)
        black_squares = np.where(self.grid)
        if len(black_squares[0]) == 0:
            return None
        
        # Get the minimum and maximum coordinates
        # black_squares[0] contains y coordinates (rows)
        # black_squares[1] contains x coordinates (columns)
        min_y, min_x = np.min(black_squares, axis=1)  # Top-left point
        max_y, max_x = np.max(black_squares, axis=1)  # Bottom-right point
        
        return (min_y, min_x, max_y, max_x)
    
    def export_grid(self):
        bounds = self.get_bounds()
        if bounds is None:
            return ""
        
        min_y, min_x, max_y, max_x = bounds
        
        # Extract the subgrid containing only the area with black squares
        # Include both min and max coordinates (hence +1)
        subgrid = self.grid[min_y:max_y+1, min_x:max_x+1]
        
        # Convert to text format
        result = []
        for row in subgrid:
            result.append(''.join('#' if cell else '.' for cell in row))
        return '\n'.join(result)
    
    def import_grid(self, text):
        lines = text.strip().split('\n')
        if not lines:
            return
        
        # Create a new grid with the size of the imported data
        height = len(lines)
        width = len(lines[0])
        self.size = max(height, width)
        self.grid = np.zeros((self.size, self.size), dtype=bool)
        
        # Fill the grid with the imported data
        for i, line in enumerate(lines):
            for j, char in enumerate(line):
                if char == '#':
                    self.grid[i, j] = True
        
        self.update()

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Grid Editor")
        self.setMinimumSize(800, 600)
        
        # Create main widget and layout
        main_widget = QWidget()
        self.setCentralWidget(main_widget)
        layout = QVBoxLayout(main_widget)
        
        # Create scroll area for the grid
        scroll_area = QScrollArea()
        scroll_area.setWidgetResizable(True)
        self.grid_widget = GridWidget()
        scroll_area.setWidget(self.grid_widget)
        layout.addWidget(scroll_area)
        
        # Create button panel
        button_layout = QHBoxLayout()
        
        import_button = QPushButton("Import")
        import_button.clicked.connect(self.import_file)
        button_layout.addWidget(import_button)
        
        export_button = QPushButton("Export")
        export_button.clicked.connect(self.export_file)
        button_layout.addWidget(export_button)
        
        # Add mode toggle button
        self.mode_button = QPushButton("Mode: Line")
        self.mode_button.clicked.connect(self.toggle_mode)
        button_layout.addWidget(self.mode_button)
        
        # Add drag mode buttons
        self.add_mode_button = QPushButton("Add Mode (1)")
        self.add_mode_button.clicked.connect(lambda: self.set_drag_mode("add"))
        button_layout.addWidget(self.add_mode_button)
        
        self.remove_mode_button = QPushButton("Remove Mode (2)")
        self.remove_mode_button.clicked.connect(lambda: self.set_drag_mode("remove"))
        button_layout.addWidget(self.remove_mode_button)
        
        self.invert_mode_button = QPushButton("Invert Mode (3)")
        self.invert_mode_button.clicked.connect(lambda: self.set_drag_mode("invert"))
        button_layout.addWidget(self.invert_mode_button)
        
        layout.addLayout(button_layout)
        
        # Update button states
        self.update_drag_mode_buttons()
    
    def set_drag_mode(self, mode):
        self.grid_widget.drag_mode = mode
        self.update_drag_mode_buttons()
        self.grid_widget.update()
    
    def update_drag_mode_buttons(self):
        mode = self.grid_widget.drag_mode
        self.add_mode_button.setStyleSheet("" if mode != "add" else "background-color: #90EE90;")
        self.remove_mode_button.setStyleSheet("" if mode != "remove" else "background-color: #FFB6C1;")
        self.invert_mode_button.setStyleSheet("" if mode != "invert" else "background-color: #DDA0DD;")
    
    def import_file(self):
        file_name, _ = QFileDialog.getOpenFileName(
            self, "Import Grid", "", "Engimap Files (*.engimap);;All Files (*)")
        
        if file_name:
            try:
                with open(file_name, 'r') as f:
                    content = f.read()
                self.grid_widget.import_grid(content)
            except Exception as e:
                print(f"Error importing file: {e}")
    
    def export_file(self):
        file_name, _ = QFileDialog.getSaveFileName(
            self, "Export Grid", "", "Engimap Files (*.engimap);;All Files (*)")
        
        if file_name:
            try:
                content = self.grid_widget.export_grid()
                with open(file_name, 'w') as f:
                    f.write(content)
            except Exception as e:
                print(f"Error exporting file: {e}")
    
    def toggle_mode(self):
        self.grid_widget.is_line_mode = not self.grid_widget.is_line_mode
        self.mode_button.setText(f"Mode: {'Line' if self.grid_widget.is_line_mode else 'Plane'}")
        self.grid_widget.update()

if __name__ == '__main__':
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec()) 