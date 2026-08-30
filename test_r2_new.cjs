const { S3Client, ListBucketsCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({
  region: 'auto',
  endpoint: 'https://1c30f4a4fa4c5ccec8107622d36374f9.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: 'f2dc90cedb4d2b0331cd6a15df39b773',
    secretAccessKey: 'ea3e06a829db2f6836576ea2633e176245e0f9f81be9eeb0fe0865e4b91b58da'
  }
});

s3.send(new ListBucketsCommand({}))
  .then(res => {
    console.log("Success! Buckets:");
    res.Buckets.forEach(b => console.log(b.Name));
    process.exit(0);
  })
  .catch(err => {
    console.error("Error connecting to R2:", err.message);
    process.exit(1);
  });
