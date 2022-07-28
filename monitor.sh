while :
do
        ulimit -n 819200
        stillRunning=$(ps -ef |grep "node" |grep -v "grep")
        if [ "$stillRunning" ] ; then
                echo "process already started!"
                sleep 1
        else
                node --unhandled-rejections=strict /root/wcl/index.js > /root/wcl/log.txt 2>&1 &
                echo "process has been restarted!"
                sleep 2
        fi
done
