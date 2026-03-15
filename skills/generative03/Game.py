import sys, random, logging
from random import randint
# from PyQt5.QtWidgets import *
from PyQt5 import QtWidgets as qtw
from PyQt5 import QtGui as qtg
from PyQt5 import QtCore as qtc
from PyQt5.QtWidgets import QMainWindow, QApplication, QWidget, QAction, QTableWidget,QTableWidgetItem,QVBoxLayout
from PyQt5.QtCore import pyqtSlot

from NameGenerator import NameGenerator

import Dungeon, Town

logging.basicConfig(format='%(levelname)s:%(message)s', level=logging.DEBUG)



class Game(qtw.QWidget):

   def __init__(self):
      super().__init__()
      self.test = 'from the Game class'      
      # self.party = {}
      # self.hiringPool = {}


      self.town = Town.TownWindow(parent=self)
      self.town.show()



if __name__ == "__main__":
   app = QApplication(sys.argv)
   game = Game()
   sys.exit(app.exec_())
