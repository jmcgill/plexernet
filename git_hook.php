<?php
 
ignore_user_abort(true);
 
function syscall ($cmd, $cwd) {
	$descriptorspec = array(
		1 => array('pipe', 'w') // stdout is a pipe that the child will write to
	);
	$resource = proc_open($cmd, $descriptorspec, $pipes, $cwd);
	if (is_resource($resource)) {
		$output = stream_get_contents($pipes[1]);
		fclose($pipes[1]);
		proc_close($resource);
		return $output;
	}
}
 
// GitHub will hit us with POST (http://help.github.com/post-receive-hooks/)
//if (!empty($_POST['payload'])) {
        echo "Running";	
	// pull from master
	$result = syscall('git pull');
        echo "Pull done";
        echo $result
 
	// clear APC
	//if (apc_clear_cache('opcode') == false) {
//		mail('root', 'Unable to apc_clear_cache()', '');
//	}
//}
?>
Hello
