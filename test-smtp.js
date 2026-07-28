import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: 'pdpa.utopia@gmail.com',
    pass: 'bxabpsctfsoqihrh',
  },
});

transporter.verify(function (error, success) {
  if (error) {
    console.log('SMTP Connection Error:', error);
  } else {
    console.log('Server is ready to take our messages:', success);
  }
});
