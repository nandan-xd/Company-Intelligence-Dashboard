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
     if len(config) == 0:
         return None
     data = config
     return data

def company_news(cN):
     cN=cN.lower()
     data = None
     params={'q': cN, 'apiKey': os.getenv('News_API_Key')}
     response = requests.get('https://newsapi.org/v2/everything', params=params)
     config=response.json()
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
          market_cap = None
          company_news_info = None
          if request.method == "POST":
               companyName = request.form['companyName']
               if companyName.lower() == 'facebook' or companyName.lower() == 'instagram':
                    companyName = 'Meta'
               elif companyName.lower() == 'google' or companyName.lower() == 'youtube':
                    companyName = 'Alphabet'
               company_info = get_info(companyName)
               company_news_info = company_news(companyName)
               if company_info != None:
                    username = session.get('username')
                    searchHistory = Search(username, companyName)
                    db.session.add(searchHistory)
                    db.session.commit()
                    market_cap = company_info.get('marketCapitalization')
                    if market_cap != None:
                         if market_cap >= 1000000:
                              market_cap = f"${round(market_cap/1000000, 2)} Trillion"
                         else:
                              market_cap = f"${round(market_cap/1000, 2)} Billion"
                    else:
                         return redirect(url_for('error'))             
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
                    company_news_info = company_news(companyName)
                    if company_info == None:
                         return redirect(url_for('error'))
                    else:
                         market_cap = company_info.get('marketCapitalization')
                         if market_cap != None:
                              if market_cap >= 1000000:
                                   market_cap = f"${round(market_cap/1000000, 2)} Trillion"
                              else:
                                   market_cap = f"${round(market_cap/1000, 2)} Billion"
                         else:
                              return redirect(url_for('error'))
               else: 
                    return render_template('base.html', company_info=company_info, market_cap=market_cap, company_news_info=company_news_info)
          return render_template('base.html', company_info=company_info, market_cap=market_cap, company_news_info=company_news_info)
     else:
          return redirect(url_for('login'))

@app.route('/delete', methods=['POST', 'GET'])
def delete():
     username = session.get('username')
     user = Search.query.filter_by(name=username).all()
     if 'companyList' in session:
          companyList = session.get('companyList', [])
     else:
          companyList = request.args.get('companyList')
     companyName = request.args.get('companyName')
     if companyName in companyList:
          if companyName != companyList[0]:
               companyList.remove(companyName)
               for i in user:
                    if i.company == companyName:
                         db.session.delete(i)
                         db.session.commit()
          else:
               companyList.pop(0)
               db.session.delete(user[0])
               db.session.commit()
     if 'companyList' in session:
          session['companyList'] = companyList
     return redirect(url_for('searchHistory'))

@app.route('/search-history')
def searchHistory():
     if 'username' in session:
          username = session.get('username')
          user = Search.query.filter_by(name=username).all()
          companyList = [i.company for i in user]
          session['companyList'] = companyList
          return render_template('searchHistory.html', companyList=companyList)
     else:
          return redirect (url_for('login'))

@app.route('/error')
def error():
     return render_template('error.html')

@app.route('/logout')
def logout():
     session.pop('username', None)
     return redirect(url_for('login'))

if __name__ == '__main__':
     app.run(debug=True)