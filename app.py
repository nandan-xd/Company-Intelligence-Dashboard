from flask import Flask, render_template, request, url_for, redirect, session
from werkzeug.security import generate_password_hash, check_password_hash
from flask_sqlalchemy import SQLAlchemy
import os
import requests
from dotenv import load_dotenv
from datetime import timedelta
load_dotenv()
app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('Secret_Key')
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATION'] = False
db = SQLAlchemy(app)
app.permanent_session_lifetime = timedelta(days = 5)
def get_info(cN):
     cN = cN.lower()
     data = None
     params = { 'q': cN, 'token': os.getenv('Finnhub_API_Key') }
     response = requests.get('https://finnhub.io/api/v1/search', params=params)
     config = response.json()
     smbl = config["result"][0]['symbol'] if config["result"] else None
     if smbl is None:
         return None
     params = { 'symbol': smbl, 'token': os.getenv('Finnhub_API_Key') }
     response = requests.get('https://finnhub.io/api/v1/stock/profile2', params=params)
     config = response.json()
     country = config['country'] if 'country' in config else None 
     if country is None:
         return None
     if len(config) == 0:
         return None
     if country != 'US' or country != 'USA':
         params = {'function': 'OVERVIEW', 'symbol': smbl, 'apikey': os.getenv('Alpha_Vantage_API_Key')}
         response = requests.get('https://www.alphavantage.co/query?', params=params)
         data = response.json()
     else:
         data = config
     return data

class Users(db.Model):
     id = db.Column(db.Integer, primary_key=True)
     name = db.Column(db.String(50), nullable=False, unique=True)
     password = db.Column(db.String(500), nullable=False)

     def __init__(self, name, password):
          self.name = name
          self.password = password

class Search(db.Model):
     id = db.Column(db.Integer, primary_key=True)
     name = db.Column(db.ForeignKey(Users.name))
     company = db.Column(db.String(50))

     def __init__(self, name, company):
          self.name = name
          self.company = company

with app.app_context():
     db.create_all()

@app.route('/register', methods=['GET', 'POST'])
def register():
     if request.method == 'POST':
               username = request.form['unm']
               session['username'] = username
               password = request.form['pass']
               cpassword = request.form['passw']
               user = Users.query.filter_by(name=username).first()
               if user != None:
                    if username == user.name:
                         message = 'Username already exists, try another username'
                         return render_template('register.html', message=message)
               else:
                    if password == cpassword:
                         password = generate_password_hash(password)
                         newUser = Users(username, password)
                         db.session.add(newUser)
                         db.session.commit()
                         return redirect(url_for('index'))
                    else:
                         message = 'Passwords does not match'
                         return render_template('register.html', message=message)
     return render_template('register.html')

@app.route('/login', methods = ['POST', 'GET'])
def login():
     if request.method == 'POST':
          if 'Users.query.filter_by(name=username)' in session:
               return redirect(url_for('index'))
          else:
               username = request.form['unm']
               password = request.form['pass']
               session['username'] = username
               user = Users.query.filter_by(name=username).first()
               if user != None and check_password_hash(user.password, password) == True:
                    return redirect(url_for('index'))
               else:
                    message = 'Wrong password or username, please check!'
                    return render_template('login.html', message=message)
     return render_template('login.html')

@app.route('/', methods=['POST', 'GET'])
def index():
     if 'username' in session:
          company_info = None
          if request.method == "POST":
               companyName = request.form['companyName']
               if companyName.lower() == 'facebook' or companyName.lower() == 'instagram':
                    companyName = 'Meta'
               elif companyName.lower() == 'google' or companyName.lower() == 'youtube':
                    companyName = 'Alphabet'
               company_info = get_info(companyName)
               session['company_info'] = company_info
               if company_info != None:
                    username = session.get('username')
                    searchHistory = Search(username, companyName)
                    db.session.add(searchHistory)
                    db.session.commit()              
               else: 
                    return redirect(url_for('error'))
          else:
               companyName = request.args.get('companyName')
               if companyName != None:
                    if companyName.lower() == 'facebook' or companyName.lower() == 'instagram':
                         companyName = 'Meta'
                    elif companyName.lower() == 'google' or companyName.lower() == 'youtube':
                         companyName = 'Alphabet'
                    company_info = get_info(companyName)
                    if company_info == None:
                         return redirect(url_for('error'))
               else: 
                    return render_template('base.html', company_info=company_info)
          return render_template('base.html', company_info=company_info)      
     else:
          return redirect(url_for('login'))

@app.route('/search-history')
def searchHistory():
     username = session.get('username')
     user = Search.query.filter_by(name=username).all()
     companyList = []
     for i in user:
          if i.company not in companyList:
               companyList.append(i.company)
          else:
               pass
     return render_template('searchHistory.html', companyList=companyList)

@app.route('/error')
def error():
     company_info = session.get('company_info')
     return render_template('error.html', company_info=company_info)

@app.route('/logout')
def logout():
     session.pop('username', None)
     return redirect(url_for('login'))

if __name__ == '__main__':
     app.run(debug=True)