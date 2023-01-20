const AWS = require('aws-sdk');
const ses = new AWS.SES({ apiVersion: '2010-12-01' });
const dynamo = new AWS.DynamoDB.DocumentClient();
const tableName = "tableLottery";
const ticketTableName = "tableLotteryTicket";

//Registra Serie
const registerSeries = async () => {
  for (let i = 0; i <= 100; i++) {
    let formattedNumber = i.toString().padStart(2, "0");
    const params = {
      TableName: tableName,
      Item: {
        "numberticket": formattedNumber,
        "status": "active"
      }
    };
    await dynamo.put(params).promise();
  }
  console.log("Series registered successfully in table: " + tableName);
};

exports.StartLottery = async (event) => {
  await registerSeries();
  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*"
    },
    body: "Series registered successfully"
  }
};


//Registra boleto vendido
const registerTicket = async (number, name, email, phone, paymentStatus) => {
  const ticketParams = {
    TableName: ticketTableName,
    Item: {
      "numberticket": number,
      "nameperson": name,
      "email": email,
      "phone": phone,
      "paymentStatus": paymentStatus
    }
  };
  await dynamo.put(ticketParams).promise();
  console.log("Ticket registered successfully in table: " + ticketTableName);

  const lotteryParams = {
    TableName: tableName,
    Key: {
      "numberticket": number
    },
    UpdateExpression: "set #status = :status",
    ExpressionAttributeNames: {
      "#status": "status"
    },
    ExpressionAttributeValues: {
      ":status": "sold out"
    },
    ReturnValues: "UPDATED_NEW"
  };
  await dynamo.update(lotteryParams).promise();
  console.log("Number status updated to 'sold out' in table: " + tableName);

  const emailParams = {
    Destination: {
      ToAddresses: [email]
    },
    Message: {
      Body: {
        Text: {
          Data: `Dear ${name},\n\nYour ticket with number ${number} has been registered and paid successfully.\n\nThanks,\nThe Lottery Team`
        }
      },
      Subject: {
        Data: "Lottery Ticket Purchase Confirmation!"
      }
    },
    Source: "wilmar.cabezas@gmail.com"
  };
  //await ses.sendEmail(emailParams).promise();
  console.log("Email sent to: " + email);
};

exports.RegisterTicket = async (event, context) => {

  const body = JSON.parse(event.body);

  const number = body.number;
  const name = body.name;
  const email = body.email;
  const phone = body.phone;
  const paymentStatus = body.paymentStatus;
  await registerTicket( number, name, email, phone, paymentStatus);
  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*"
    },
    body: "Ticket registered successfully"
  }
};


//Elimina Boleta

const deleteTicket = async (number) => {
  console.log('Desde el Delete:',number.number);
  const ticketParams = {
    TableName: ticketTableName,
    Key: {
      "numberticket": number.number
    }
  };
  console.log(ticketParams);

  await dynamo.delete(ticketParams).promise();
  console.log("Ticket deleted successfully from table: " + ticketTableName);

  const lotteryParams = {
    TableName: tableName,
    Key: {
      "numberticket": number.number
    },
    UpdateExpression: "set #status = :status",
    ExpressionAttributeNames: {
      "#status": "status"
    },
    ExpressionAttributeValues: {
      ":status": "active"
    },
    ReturnValues: "UPDATED_NEW"
  };
  await dynamo.update(lotteryParams).promise();
  console.log("Number status updated to 'active' in table: " + tableName);
};

exports.DeleteTicket = async (event) => {
  console.log('Prueba');
  const number = event.queryStringParameters;
  console.log('Number es: ',number)
 

  await deleteTicket(number);
  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*"
    },
    body: "Ticket deleted successfully"
  }
};


//Datos de Table Loteria
const getLotteryData = async () => {
  const params = {
    TableName: tableName
  };
  const data = await dynamo.scan(params).promise();
  return data.Items;
};

exports.GetLotteryData = async (event) => {
  const data = await getLotteryData();
  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*"
    },
    body: JSON.stringify(data)
  }
};

//Datos de Boleta
const getTicketData = async () => {
  const params = {
    TableName: ticketTableName
  };
  const data = await dynamo.scan(params).promise();
  return data.Items;
};

exports.GetTicketData = async (event) => {
  const data = await getTicketData();
  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*"
    },
    body: JSON.stringify(data)
  }
};

