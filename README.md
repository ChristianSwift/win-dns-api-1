Windows DNS API (Node.JS)
===========

A simple Node.JS server for updating the integrated DNS server that ships with windows.

Requirements:
 - Windows Server 2008 and above
 - DNS Server Role
 - Allow traffic to port 3111 
 - Access to %WINDIR%\system32\dns


Quick start:

    npm i
    npm start    
    
Build a single executable:

    npm run build-exec
    
Operations:

    # Get available zones http:// <dns-host> :3111/dns/
    > curl http://localhost:3111/dns
    
    # Get zone records as JSON http:// <dns-host> :3111/dns/:zone
    > curl http://localhost:3111/dns/test.com
    
    # Get zone file in raw format http:// <dns-host> :3111/dns/:zone/raw
    > curl http://localhost:3111/dns/test.com/raw
    
    # Set record http:// <dns-host> :3111/dns/ <zone> /a/ <node> /set/ <ip>
    > curl http://localhost:3111/dns/acme.local/a/server1/set/1.2.3.4
    
    # http:// <dns-host> :3111/dns/ <zone> /a/ <node> /remove
    > curl http://localhost:3111/dns/acme.local/a/server1/remove    
    
