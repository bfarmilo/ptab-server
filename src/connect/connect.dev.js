const spawn = require('child_process').spawn;

const getContainerIP = (container) => {
    // initialize container connection parameters
    const child = spawn("powershell.exe", [`docker inspect --format '{{.NetworkSettings.Networks.nat.IPAddress}}' ${container}`]);
    child.stdout.on("data", function (data) {
        return data.toString().split(/\n/g)[0];
    });
    child.stderr.on("data", function (error) {
        return error.toString();
    });
    child.stdin.end(); //end input
}

module.exports = {
    getContainerIP
}