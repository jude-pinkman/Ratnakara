@echo off
set "ROOT=%~dp0..\..\.."
cd /d %ROOT%\frontend
node ..\node_modules\next\dist\bin\next dev -p 3000
