import random, logging
from random import randrange
from PyQt5 import QtWidgets as qtw
from PyQt5 import QtGui as qtg
from PyQt5 import QtCore as qtc
from PyQt5.QtWidgets import QMainWindow, QApplication, QWidget, QAction, QTableWidget,QTableWidgetItem,QVBoxLayout
from PyQt5.QtCore import pyqtSlot

logging.basicConfig(format='%(levelname)s:%(message)s', level=logging.DEBUG)


class Town(qtw.QWidget):

   def __init__(self):
      super().__init__()

      self.resize(1024,768)
      self.setWindowTitle('Neverending Fantasy Manager')

      self.initHiringPoolTable()

      self.initPartyTable()

      self.hireButton = qtw.QPushButton('Hire', clicked=self.onHire)
      self.hireButton.setFixedSize(80,50)

      self.dungeonButton = qtw.QPushButton('Dungeon', clicked=self.onDungeon)
      self.dungeonButton.setFixedSize(80,50)



      self.layout = qtw.QVBoxLayout()

      self.layout.addWidget(self.hiringPoolTable)
      self.layout.addWidget(self.hireButton)
      self.layout.addWidget(self.partyTable)
      self.layout.addWidget(self.dungeonButton)

      self.setLayout(self.layout)

      self.show()


   def initPartyTable(self):
      self.partyTable = QTableWidget()
      self.partyTable.setRowCount(1)
      self.partyTable.setColumnCount(11)
      self.partyTable.setSelectionBehavior(QTableWidget.SelectRows);

      self.partyTable.setColumnHidden(0, True);  # Hide column with player ID
      self.partyTable.setHorizontalHeaderLabels(statTableList)


   def initHiringPoolTable(self):

      numPlayers = 5

      self.hiringPoolTable = QTableWidget()
      self.hiringPoolTable.setRowCount(numPlayers)
      self.hiringPoolTable.setColumnCount(len(statTableList))
      self.hiringPoolTable.setSelectionBehavior(QTableWidget.SelectRows);

      self.hiringPoolTable.setHorizontalHeaderLabels(statTableList)

      for x in range(numPlayers):
         player = Player()
         global playerPool
         playerPool[player.id] = player

         self.hiringPoolTable.setItem(x,0, QTableWidgetItem(str(player.id)))
         self.hiringPoolTable.setItem(x,1, QTableWidgetItem(str(player.name)))
         self.hiringPoolTable.setItem(x,2, QTableWidgetItem(str(player.ovr)))
         self.hiringPoolTable.setItem(x,3, QTableWidgetItem(str(player.pot)))
         self.hiringPoolTable.setItem(x,4, QTableWidgetItem(str(player.str)))
         self.hiringPoolTable.setItem(x,5, QTableWidgetItem(str(player.dex)))
         self.hiringPoolTable.setItem(x,6, QTableWidgetItem(str(player.con)))
         self.hiringPoolTable.setItem(x,7, QTableWidgetItem(str(player.int)))
         self.hiringPoolTable.setItem(x,8, QTableWidgetItem(str(player.spi)))
         self.hiringPoolTable.setItem(x,9, QTableWidgetItem(str(player.hp)))
         self.hiringPoolTable.setItem(x,10, QTableWidgetItem(str(player.mana)))

      self.hiringPoolTable.setSortingEnabled(True)

      self.hiringPoolTable.resizeColumnsToContents()
      self.hiringPoolTable.resizeRowsToContents()
      self.hiringPoolTable.setColumnHidden(0, True);  # Hide column with player ID

      # table selection change
      self.hiringPoolTable.clicked.connect(self.on_click)

   @pyqtSlot()
   def on_click(self):
      print("\n")
      for currentQTableWidgetItem in self.hiringPoolTable.selectedItems():
         print(currentQTableWidgetItem.row(), currentQTableWidgetItem.column(), currentQTableWidgetItem.text())
      row = self.hiringPoolTable.currentRow()
      print("\n")
      print(row)
      print(self.hiringPoolTable.item(row, 0).text())

   @pyqtSlot()
   def onHire(self):
      # add player from table row to hired player
      row = self.hiringPoolTable.currentRow()
      playerId = self.hiringPoolTable.item(row, 0).text()  # Do it this way because it is a hidden row so can't use .selectedItems
      player = playerPool.get(int(playerId))
      if player:
         print('Hired ' + player.name)
         global playerParty
         playerParty[int(playerId)] = player
         #print(playerParty)

         x = len(playerParty)-1
         self.partyTable.setRowCount(len(playerParty))

         # Eventually switch to model/view approach

         self.partyTable.setItem(x,0, QTableWidgetItem(str(player.id)))
         self.partyTable.setItem(x,1, QTableWidgetItem(str(player.name)))
         self.partyTable.setItem(x,2, QTableWidgetItem(str(player.ovr))) 
         self.partyTable.setItem(x,3, QTableWidgetItem(str(player.pot)))
         self.partyTable.setItem(x,4, QTableWidgetItem(str(player.str)))
         self.partyTable.setItem(x,5, QTableWidgetItem(str(player.dex)))
         self.partyTable.setItem(x,6, QTableWidgetItem(str(player.con)))
         self.partyTable.setItem(x,7, QTableWidgetItem(str(player.int)))
         self.partyTable.setItem(x,8, QTableWidgetItem(str(player.spi)))
         self.partyTable.setItem(x,9, QTableWidgetItem(str(player.hp)))
         self.partyTable.setItem(x,10, QTableWidgetItem(str(player.mana)))

         self.partyTable.resizeColumnsToContents()
         self.partyTable.resizeRowsToContents()
         self.partyTable.setSortingEnabled(True)

         self.hiringPoolTable.removeRow(row)

   @pyqtSlot()
   def onDungeon(self):
      self.dungeon = Dungeon.DungeonWindow(self)
      self.close()         # this destroys the current window; can call .hide() to hide it instead if we want to resume it
      self.dungeon.show()  # https://stackoverflow.com/questions/36768033/pyqt-how-to-open-new-window
                           # this is also a useful tutorial: https://www.learnpyqt.com/tutorials/creating-multiple-windows/
