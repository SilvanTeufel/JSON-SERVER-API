const nodemailer = require('nodemailer');

const createtransporter = (service: string, from: string, pass: string) => {
  const transporter = nodemailer.createTransport({
    service,
    auth: {
      user: from,
      pass
    }
  });
  return transporter;
};

const createMailoptions = (from: string, to: string, subject: string, text: string) => {
  const mailOptions = {
    from,
    to,
    subject,
    text
  };
  return mailOptions;
};

export const sendMail = (service: string, from: string, pass: string, to: string, subject: string, text: string) => {
  createtransporter(service, from, pass).sendMail(
    createMailoptions(from, to, subject, text),
    (error: any, info: any) => {
      if (error) {
        console.log(error);
        return error;
      } else {
        console.log('Email sent: ' + info.response);
        return info.response;
      }
    }
  );
};

/*
  transporter.sendMail(mailOptions, (error: any, info: any) => {
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });

*/
