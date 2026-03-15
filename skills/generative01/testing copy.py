import sys, random
from random import randint
from PyQt5.QtWidgets import *
from PyQt5 import QtWidgets as qtw
from PyQt5 import QtGui as qtg
from PyQt5 import QtCore as qtc
from PyQt5.QtWidgets import QMainWindow, QApplication, QWidget, QAction, QTableWidget,QTableWidgetItem,QVBoxLayout

from NameGenerator import NameGenerator



def dialog():
   mbox = QMessageBox()

   mbox.setText("Your allegiance has been noted")
   mbox.setDetailedText("You are now a disciple and subject of the all-knowing Guru")
   mbox.setStandardButtons(QMessageBox.Ok | QMessageBox.Cancel)
            
   mbox.exec_()

class Player():
   def __init__(self):
      super().__init__()
      self.str = self.GenerateStat()
      self.dex = self.GenerateStat()
      self.con = self.GenerateStat()
      self.int = self.GenerateStat()
      self.spi = self.GenerateStat()
      self.pot = self.GenerateStat()

      self.hp = self.con * random.randint(4,6)
      self.mana = self.spi * random.randint(4,6)

      nameGenerator = NameGenerator()
      self.name = nameGenerator.generate()



   def GenerateStat(self):
      return random.randint(1,10)

if __name__ == "__main__":
   app = QApplication(sys.argv)
   w = QWidget()
   w.resize(1024,768)
   w.setWindowTitle('Neverending Fantasy Manager')
    
    # label = QLabel(w)
    # label.setText("Behold the Guru, Guru99")
    # label.move(100,130)
    # label.show()

    # btn = QPushButton(w)
    # btn.setText('Beheld')
    # btn.move(110,150)
    # btn.show()
    # btn.clicked.connect(dialog)



   playerTable = QTableWidget(w)


   playerTable.width = 600
   playerTable.height = 400
   playerTable.setRowCount(5)
   playerTable.setColumnCount(9)
   for x in range(5):
      player = Player()
      playerTable.setItem(x,0, QTableWidgetItem(str(player.name)))
      playerTable.setItem(x,1, QTableWidgetItem(str(player.str)))
      playerTable.setItem(x,2, QTableWidgetItem(str(player.dex)))
      playerTable.setItem(x,3, QTableWidgetItem(str(player.con)))
      playerTable.setItem(x,4, QTableWidgetItem(str(player.int)))
      playerTable.setItem(x,5, QTableWidgetItem(str(player.spi)))
      playerTable.setItem(x,6, QTableWidgetItem(str(player.pot)))
      playerTable.setItem(x,7, QTableWidgetItem(str(player.hp)))
      playerTable.setItem(x,8, QTableWidgetItem(str(player.mana)))


   playerTable.resizeColumnsToContents()
   playerTable.resizeRowsToContents()

   playerTable.show()






    
   w.show()
   sys.exit(app.exec_())





# app = QApplication([])
# app.setStyle('Fusion')
# app.setStyleSheet("QPushButton { margin: 10ex; }")
# button = QPushButton('Click')
# def on_button_clicked():
#     alert = QMessageBox()
#     alert.setText('You clicked the button!')
#     alert.exec_()

# button.clicked.connect(on_button_clicked)
# button.show()
# app.exec_()
	
# if __name__ == '__main__':
#    window()