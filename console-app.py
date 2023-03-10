# Python 3.10
import requests

while True:
    req = input("Command: ")
    arr = req.split(',')
    cmd = arr[0]
    match cmd: # Only Python 3.10 and above support this
        case 'exit':
            break
        case 'ADD':
            response = requests.post(
                'http://localhost:3000/users',
                json = {"userID": arr[1], "balance": int(arr[2])}
            )
            print(response)
            response.close()
        case 'QUOTE':
            response = requests.get(
                f'http://localhost:3000/quote?user_id={arr[1]}&symbol={arr[2]}'
            )
            print(response.text)
            response.close()