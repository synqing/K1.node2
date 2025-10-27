void draw_neurons() {
	// Note: This mode still uses 64 neurons which map to spectrum bins
	// We'll interpolate the display across the available LEDs
	for (uint16_t i = 0; i < NUM_LEDS>>1; i++) {
		// Map LED position to neuron index (0-63)
		uint16_t neuron_index = (i * 64) / (NUM_LEDS>>1);
		if (neuron_index >= 64) neuron_index = 63;
		
		float input_neuron_value = clip_float(input_neuron_values[neuron_index]);
		
		float hidden_neuron_2_value = clip_float(hidden_neuron_1_values[neuron_index>>1]*0.2);
		float hidden_neuron_3_value = clip_float(hidden_neuron_3_values[neuron_index>>1]*0.2);
		float output_neuron_value   = clip_float(output_neuron_values[neuron_index]);

		CRGBF color_network = {
			(hidden_neuron_2_value*hidden_neuron_2_value),
			(hidden_neuron_3_value*hidden_neuron_3_value),
			sqrt(output_neuron_value),
		};

		CRGBF color_spectral = {
			0,
			spectrogram_smooth[neuron_index],
			0,
		};

		leds[(NUM_LEDS>>1)+i] = color_network;
		leds[i] = color_spectral;
	}
}