# importing libraries 
from PyQt5.QtWidgets import * 
from PyQt5 import QtCore, QtGui 
from PyQt5.QtGui import * 
from PyQt5.QtCore import * 
import sys 
  
  
class Window(QMainWindow): 
  
    def __init__(self): 
        super().__init__() 
  
        # setting title 
        self.setWindowTitle("Python ") 
  
        # setting geometry 
        self.setGeometry(100, 100, 500, 400) 
  
        # calling method 
        self.UiComponents() 
  
        # showing all the widgets 
        self.show() 
  
  
  
    # method for components 
    def UiComponents(self): 
  
        # creating a QListWidget 
        list_widget = QListWidget(self) 
  
        # setting geometry to it 
        list_widget.setGeometry(50, 70, 150, 60) 
  
        # list widget items 
        item1 = QListWidgetItem("A") 
        item2 = QListWidgetItem("B") 
        item3 = QListWidgetItem("C") 
  
        # adding items to the list widget 
        list_widget.addItem(item1) 
        list_widget.addItem(item2) 
        list_widget.addItem(item3) 
  
        # setting current row 
        list_widget.setCurrentRow(2) 
  
        # creating a label 
        label = QLabel("GeesforGeeks", self) 
  
        # setting geometry to the label 
        label.setGeometry(230, 80, 300, 80) 
  
        # making label multi line 
        label.setWordWrap(True) 
  
        # getting current selected row 
        value = list_widget.currentRow() 
  
        # setting text to the label 
        label.setText("Current Selected Row : " + str(value)) 
  
  
  
# create pyqt5 app 
App = QApplication(sys.argv) 
  
# create the instance of our Window 
window = Window() 
  
# start the app 
sys.exit(App.exec()) 