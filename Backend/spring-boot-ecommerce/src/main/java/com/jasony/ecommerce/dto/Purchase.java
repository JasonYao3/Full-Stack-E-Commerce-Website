package com.jasony.ecommerce.dto;

import com.jasony.ecommerce.entity.Address;
import com.jasony.ecommerce.entity.Customer;
import com.jasony.ecommerce.entity.Order;
import com.jasony.ecommerce.entity.OrderItem;
import lombok.Data;

import java.util.Set;

@Data
public class Purchase {

    private Customer customer;
    private Address shippingAddress;
    private Address billingAddress;
    private Order order;
    private Set<OrderItem> orderItems;
}
