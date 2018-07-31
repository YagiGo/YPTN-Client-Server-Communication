from flask import Flask, render_template
from flask_socketio import SocketIO

# Initialize
app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app)


# create server side event handler here
@socketio.on('message')
def handle_message(message):
    print('received message: ', message)


# This type is preferred since it doesn't limit type
@socketio.on('my_event')
def handle_my_custom_event(json):
    print("received json: ", str(json))


if __name__ == '__main__':
    socketio.run(app)
