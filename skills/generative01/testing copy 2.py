import sys, random
from random import randint
# from PyQt5.QtWidgets import *
from PyQt5 import QtWidgets as qtw
from PyQt5 import QtGui as qtg
from PyQt5 import QtCore as qtc
from PyQt5.QtWidgets import QMainWindow, QApplication, QWidget, QAction, QTableWidget,QTableWidgetItem,QVBoxLayout
from PyQt5.QtCore import pyqtSlot

from NameGenerator import NameGenerator

# Global Variables
playerParty = {}  # Dict of players in party
playerPool = {}   # Dict of pool of players



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

      self.id = random.randint(1000000,9999999)

      # while self.id in MainWindow().playerPool:
      #    self.id = random.randint(1000000,9999999)



   def GenerateStat(self):
      return random.randint(1,10)



class MainWindow(qtw.QWidget):

   def __init__(self):
      super().__init__()

      self.resize(1024,768)
      self.setWindowTitle('Neverending Fantasy Manager')

      self.initTable()

      self.layout = qtw.QVBoxLayout()
      
      self.layout.addWidget(self.tableWidget)

      self.hireButton = qtw.QPushButton('Hire', clicked=self.onHire)
      self.layout.addWidget(self.hireButton)

      self.setLayout(self.layout)

      self.show()


   def initTable(self):

      self.tableWidget = QTableWidget()

      # self.tableWidget.width = 600
      # self.tableWidget.height = 400
      self.tableWidget.setRowCount(5)
      self.tableWidget.setColumnCount(10)
      self.tableWidget.setSelectionBehavior(QTableWidget.SelectRows);



      for x in range(5):
         player = Player()
         global playerPool
         playerPool[player.id] = player

         self.tableWidget.setItem(x,0, QTableWidgetItem(str(player.id)))
         self.tableWidget.setItem(x,1, QTableWidgetItem(str(player.name)))
         self.tableWidget.setItem(x,2, QTableWidgetItem(str(player.str)))
         self.tableWidget.setItem(x,3, QTableWidgetItem(str(player.dex)))
         self.tableWidget.setItem(x,4, QTableWidgetItem(str(player.con)))
         self.tableWidget.setItem(x,5, QTableWidgetItem(str(player.int)))
         self.tableWidget.setItem(x,6, QTableWidgetItem(str(player.spi)))
         self.tableWidget.setItem(x,7, QTableWidgetItem(str(player.pot)))
         self.tableWidget.setItem(x,8, QTableWidgetItem(str(player.hp)))
         self.tableWidget.setItem(x,9, QTableWidgetItem(str(player.mana)))



      self.tableWidget.resizeColumnsToContents()
      self.tableWidget.resizeRowsToContents()
      self.tableWidget.setColumnHidden(0, True);  # Hide column with player ID

      # table selection change
      self.tableWidget.clicked.connect(self.on_click)

   @pyqtSlot()
   def on_click(self):
      print("\n")
      for currentQTableWidgetItem in self.tableWidget.selectedItems():
         print(currentQTableWidgetItem.row(), currentQTableWidgetItem.column(), currentQTableWidgetItem.text())
      row = self.tableWidget.currentRow()
      print("\n")
      print(row)
      print(self.tableWidget.item(row, 0).text())

   @pyqtSlot()
   def onHire(self):
      # add player from table row to hired player
      row = self.tableWidget.currentRow()
      playerId = self.tableWidget.item(row, 0).text()  # Do it this way because it is a hidden row so can't use .selectedItems
      player = playerPool.get(int(playerId))
      if player:
         print('Hired ' + player.name)
         global playerParty
         playerParty[int(playerId)] = player
      # print(playerParty)





if __name__ == "__main__":
   app = QApplication(sys.argv)
   mw = MainWindow()
   sys.exit(app.exec_())
